"use client";

import { useState, useRef, useCallback } from "react";
import type {
  HiringStrategy,
  JobDescription,
  CoverageAnalysis,
  StageRefinements,
  RefinementItem,
  ProcessIteration,
  VersionSnapshot,
  FocusArea,
  SuggestedQuestion,
} from "@reconnect/database";
import { mergeRefinementDiff, type MergeResult } from "@reconnect/ai/merge";
import type { RefinementDiff } from "@reconnect/ai/schemas";
import { StageBlueprint, type ApplyState } from "./stage-blueprint";
import { CoverageAnalysisPanel } from "./coverage-analysis-panel";
import { RecommendationsPanel } from "./recommendations-panel";
import { Sparkle, CircleNotch, ArrowRight, ClockCounterClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface StageData {
  id: string;
  playbook_id: string;
  name: string;
  type: string;
  duration_minutes: number;
  description: string | null;
  order_index: number;
  focus_areas: FocusArea[] | null;
  suggested_questions: SuggestedQuestion[] | null;
  rationale?: string | null;
  [key: string]: unknown;
}

interface ProcessPageClientProps {
  playbook: {
    id: string;
    title: string;
    level: string | null;
    industry: string | null;
    job_description: JobDescription | null;
    hiring_strategy: HiringStrategy | null;
    market_insights: Record<string, unknown> | null;
    coverage_analysis: CoverageAnalysis | null;
    stage_refinements: StageRefinements | null;
  };
  initialStages: StageData[];
}

const processItems = [
  { id: "stages", name: "Interview Stages" },
  { id: "coverage", name: "Coverage Analysis" },
  { id: "recommendations", name: "Recommendations" },
] as const;

export function ProcessPageClient({
  playbook,
  initialStages,
}: ProcessPageClientProps) {
  const [stages, setStages] = useState<StageData[]>(initialStages);
  const [activeItem, setActiveItem] = useState("stages");
  const [coverageAnalysis, setCoverageAnalysis] = useState<CoverageAnalysis | null>(
    playbook.coverage_analysis,
  );
  const [stageRefinements, setStageRefinements] = useState<StageRefinements | null>(
    playbook.stage_refinements,
  );

  // ── Apply flow state ──
  const [applyInProgress, setApplyInProgress] = useState(false);
  const [applyStep, setApplyStep] = useState<"ai" | "saving" | "coverage" | null>(null);
  const applyGuardRef = useRef(false);
  // Persisted history — survives stageRefinements being nulled after apply
  const [iterationHistory, setIterationHistory] = useState<ProcessIteration[]>(
    playbook.stage_refinements?.history ?? [],
  );

  const strategy = playbook.hiring_strategy;
  const jd = playbook.job_description;

  const coverageEnabled = stages.length > 0 && jd !== null && !applyInProgress;
  const recommendationsEnabled = coverageAnalysis !== null && !applyInProgress;

  // Compute apply state for stage-blueprint overlay (only during AI + saving — stages are visible during coverage)
  const applyState: ApplyState | null =
    applyStep === "ai" || applyStep === "saving" ? { step: applyStep } : null;

  // ── Persist refinements helper ──
  async function persistRefinements(data: StageRefinements) {
    const saveRes = await fetch(`/api/playbooks/${playbook.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_refinements: data }),
    });
    if (!saveRes.ok) {
      console.error("[process] Refinements save failed:", await saveRes.text().catch(() => ""));
      toast.warning("Auto-save failed — your changes may not persist");
    }
  }

  // ── Restore handler ──
  const handleRestore = useCallback(async (entry: ProcessIteration) => {
    if (!entry.snapshot || applyGuardRef.current) return;
    applyGuardRef.current = true;

    const snapshot = entry.snapshot;

    try {
      // Coerce snapshot stage types
      const VALID_STAGE_TYPES = new Set(["screening", "technical", "behavioral", "cultural", "final", "custom"]);
      const coercedStages = snapshot.stages.map((s) => ({
        ...s,
        type: VALID_STAGE_TYPES.has(s.type) ? s.type : "custom",
      }));

      // 1. PUT stages
      const replaceRes = await fetch(`/api/playbooks/${playbook.id}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coercedStages),
      });

      if (!replaceRes.ok) throw new Error("Failed to restore stages");
      const result = await replaceRes.json();
      const created: StageData[] = result.data ?? [];

      // 2. PATCH coverage
      const covPatchRes = await fetch(`/api/playbooks/${playbook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverage_analysis: snapshot.coverage }),
      });
      if (!covPatchRes.ok) {
        console.error("[process] Coverage restore save failed:", await covPatchRes.text().catch(() => ""));
        toast.warning("Stages restored but coverage may not have saved");
      }

      // 3. Update React state
      setStages(created);
      setCoverageAnalysis(snapshot.coverage as CoverageAnalysis);

      // 4. Restore refinements if snapshot has them
      if (snapshot.refinements) {
        const restored: StageRefinements = {
          items: snapshot.refinements.items,
          user_prompt: snapshot.refinements.user_prompt,
          generated_at: new Date().toISOString(),
          source_coverage_score: snapshot.refinements.source_coverage_score,
          disclaimer: snapshot.refinements.disclaimer,
          history: iterationHistory,
        };
        setStageRefinements(restored);
        await persistRefinements(restored);
      } else {
        setStageRefinements(null);
      }

      toast.success(`Restored to v${entry.version}`);
    } catch (err) {
      console.error("[process] Restore failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to restore version");
    } finally {
      applyGuardRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbook.id, iterationHistory]);

  // ── Build apply request body ──
  function buildApplyRequestBody(selectedItems: RefinementItem[], userPrompt: string) {
    const body: Record<string, unknown> = {
      mode: "apply_diff",
      role: playbook.title,
      level: playbook.level ?? "",
      industry: playbook.industry ?? "",
      selected_items: selectedItems.map((item) => ({
        title: item.title,
        type: item.type,
        change_summary: item.change_summary,
        source_detail: item.source_detail,
      })),
      current_stages: stages.map((s) => ({
        name: s.name,
        type: s.type,
        duration_minutes: s.duration_minutes,
        description: s.description ?? "",
        focus_areas: (s.focus_areas ?? []).map((fa) => ({
          name: fa.name,
          description: fa.description,
          weight: fa.weight,
        })),
        suggested_questions: (s.suggested_questions ?? []).map((q) => ({
          question: q.question,
          purpose: q.purpose,
          look_for: q.look_for,
          focus_area: q.focus_area,
        })),
      })),
      user_prompt: userPrompt || undefined,
    };

    if (jd) {
      body.jd_context = {
        responsibilities: jd.responsibilities?.slice(0, 5),
        requirements: jd.requirements?.required?.slice(0, 5),
      };
    }

    if (strategy) {
      body.strategy_context = {
        market_classification: strategy.market_classification,
        process_speed: {
          recommendation: strategy.process_speed.recommendation,
          max_stages: strategy.process_speed.max_stages,
        },
        skills_priority: {
          must_have: strategy.skills_priority.must_have.slice(0, 5),
          nice_to_have: strategy.skills_priority.nice_to_have.slice(0, 5),
        },
      };
    }

    return body;
  }

  // ── MAIN APPLY HANDLER — lifted from recommendations-panel ──
  const handleApply = useCallback(async (
    selectedItems: RefinementItem[],
    allRefinements: StageRefinements,
    userPrompt: string,
  ) => {
    // Double-click guard
    if (applyGuardRef.current) return;
    applyGuardRef.current = true;

    // Capture old state for history + rollback
    const prevCoverage = coverageAnalysis;
    const prevRefinements = stageRefinements;
    const oldScore = coverageAnalysis?.overall_coverage_score ?? 0;
    const oldGaps = coverageAnalysis?.gaps.length ?? 0;

    // 1. Lock Coverage + Recommendations tabs
    setCoverageAnalysis(null);
    setStageRefinements(null);

    // 2. Navigate to Interview Stages
    setActiveItem("stages");

    // 3. Show loading overlay on stages
    setApplyInProgress(true);
    setApplyStep("ai");

    try {
      // Step 1: AI generates refined stages
      const body = buildApplyRequestBody(selectedItems, userPrompt);

      const aiRes = await fetch("/api/ai/generate-refinements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to apply recommendations");
      }

      const { data } = await aiRes.json() as { data: RefinementDiff };

      // Merge diff onto current stages (deterministic, client-side)
      const mergeResult: MergeResult = mergeRefinementDiff(
        stages.map((s) => ({
          name: s.name,
          type: s.type,
          duration_minutes: s.duration_minutes,
          description: s.description ?? "",
          focus_areas: (s.focus_areas ?? []).map((fa) => ({
            name: fa.name,
            description: fa.description,
            weight: fa.weight,
            rationale: fa.rationale,
          })),
          suggested_questions: (s.suggested_questions ?? []).map((q) => ({
            question: q.question,
            purpose: q.purpose,
            look_for: q.look_for,
            focus_area: q.focus_area,
          })),
        })),
        data,
      );

      if (mergeResult.warnings.length > 0) {
        console.warn("[process] Merge warnings:", mergeResult.warnings);
        toast.warning(`Applied with ${mergeResult.warnings.length} warning(s) — check results`);
      }

      // Coerce merged stage types to valid DB enum values
      const VALID_STAGE_TYPES = new Set(["screening", "technical", "behavioral", "cultural", "final", "custom"]);
      const coercedStages = mergeResult.stages.map((s) => ({
        ...s,
        type: VALID_STAGE_TYPES.has(s.type) ? s.type : "custom",
      }));

      // Step 2: Atomic replace stages
      setApplyStep("saving");

      const replaceRes = await fetch(`/api/playbooks/${playbook.id}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coercedStages),
      });

      if (!replaceRes.ok) {
        throw new Error("Failed to save updated stages");
      }

      const result = await replaceRes.json();
      const created: StageData[] = result.data ?? [];

      // Show new stages (overlay clears but tabs stay locked via applyInProgress)
      setStages(created);
      setApplyStep("coverage");

      // Mark refinements as applied + append history entry
      const historyEntry: ProcessIteration = {
        version: iterationHistory.length + 1,
        score_before: oldScore,
        score_after: null, // filled after coverage
        gaps_before: oldGaps,
        gaps_after: null,
        stages_count: created.length,
        items_applied: selectedItems.map((i) => i.title),
        applied_at: new Date().toISOString(),
        change_summary: data.summary,
      };

      // Step 3: Auto-run ANCHORED coverage (if previous coverage exists)
      let newCoverage: CoverageAnalysis | null = null;
      try {
        if (jd) {
          const coverageBody: Record<string, unknown> = {
            role: playbook.title,
            level: playbook.level ?? "",
            jd_requirements: {
              required: jd.requirements?.required ?? [],
              preferred: jd.requirements?.preferred ?? [],
              responsibilities: jd.responsibilities ?? [],
            },
            stages: created.map((s) => ({
              name: s.name,
              type: s.type,
              focus_areas: (s.focus_areas ?? []).map((fa) => ({
                name: fa.name,
                description: fa.description,
              })),
            })),
          };

          // Pass anchored fields when we have previous coverage
          if (prevCoverage) {
            coverageBody.previous_coverage = prevCoverage;
            coverageBody.changed_fa_names = mergeResult.changedFANames;
            coverageBody.has_additions = mergeResult.hasAdditions;
          }

          const covRes = await fetch("/api/ai/analyze-coverage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(coverageBody),
          });

          if (covRes.ok) {
            const covData = await covRes.json();
            newCoverage = covData.data;

            // Persist coverage
            const covSaveRes = await fetch(`/api/playbooks/${playbook.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ coverage_analysis: newCoverage }),
            });
            if (!covSaveRes.ok) {
              console.error("[process] Coverage save failed:", await covSaveRes.text().catch(() => ""));
              toast.warning("Coverage analysed but failed to save — re-run from Coverage tab");
            }
          } else {
            const errBody = await covRes.text().catch(() => "");
            console.error("[process] Coverage re-analysis failed:", covRes.status, errBody);
          }
        }
      } catch (covErr) {
        console.error("[process] Coverage re-analysis failed:", covErr);
      }

      // Update history entry with coverage results + snapshot
      if (newCoverage) {
        historyEntry.score_after = newCoverage.overall_coverage_score;
        historyEntry.gaps_after = newCoverage.gaps.length;
      }

      // Create full version snapshot (stages + coverage + refinements)
      const snapshot: VersionSnapshot = {
        stages: created.map((s) => ({
          name: s.name,
          type: s.type,
          duration_minutes: s.duration_minutes,
          description: s.description ?? "",
          focus_areas: s.focus_areas ?? [],
          suggested_questions: s.suggested_questions ?? [],
        })),
        coverage: newCoverage ?? (prevCoverage as CoverageAnalysis),
        refinements: {
          items: allRefinements.items,
          user_prompt: allRefinements.user_prompt,
          source_coverage_score: allRefinements.source_coverage_score,
          disclaimer: allRefinements.disclaimer,
        },
      };
      historyEntry.snapshot = snapshot;

      // Cap history at 5 entries (prune oldest)
      const updatedHistory = [...iterationHistory, historyEntry].slice(-5);
      const historyOnly: StageRefinements = {
        items: [],
        user_prompt: allRefinements.user_prompt,
        generated_at: allRefinements.generated_at,
        applied_at: new Date().toISOString(),
        source_coverage_score: newCoverage?.overall_coverage_score ?? oldScore,
        disclaimer: allRefinements.disclaimer,
        history: updatedHistory,
      };
      await persistRefinements(historyOnly);
      setCoverageAnalysis(newCoverage);
      setIterationHistory(updatedHistory);
      // Null out recommendations — panel will auto-generate from fresh coverage
      setStageRefinements(null);
      setApplyInProgress(false);
      setApplyStep(null);

      if (newCoverage) {
        toast.success(`Recommendations applied. Coverage: ${oldScore}% → ${newCoverage.overall_coverage_score}%`);
      } else {
        toast.success("Recommendations applied. Run coverage analysis from the Coverage tab.");
      }
    } catch (err) {
      console.error("[process] Apply failed:", err);

      // Restore previous state
      setCoverageAnalysis(prevCoverage);
      setStageRefinements(prevRefinements);
      setApplyInProgress(false);
      setApplyStep(null);

      // Navigate back to recommendations
      setActiveItem("recommendations");

      toast.error(err instanceof Error ? err.message : "Failed to apply recommendations");
    } finally {
      applyGuardRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverageAnalysis, stageRefinements, stages, iterationHistory, playbook.id, playbook.title, playbook.level, playbook.industry, jd, strategy]);

  const history = iterationHistory;

  return (
    <div className="flex gap-6">
      {/* Left nav */}
      <nav className="w-44 shrink-0 space-y-0.5 pt-0.5">
        {processItems.map((item) => {
          const active = activeItem === item.id;
          const enabled = item.id === "coverage" ? coverageEnabled
            : item.id === "recommendations" ? recommendationsEnabled
            : true;
          return (
            <button
              key={item.id}
              onClick={() => enabled && setActiveItem(item.id)}
              disabled={!enabled}
              className={cn(
                "flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] font-medium transition-all",
                active
                  ? "bg-muted text-foreground"
                  : enabled
                    ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    : "cursor-not-allowed text-muted-foreground/40",
              )}
            >
              {item.name}
              {item.id === "coverage" && applyStep === "coverage" && (
                <CircleNotch size={12} weight="bold" className="ml-1.5 animate-spin text-teal-600" />
              )}
            </button>
          );
        })}

        {/* Iteration history in nav */}
        {history.length > 0 && (
          <div className="mt-4 border-t border-border/40 pt-3 px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Iterations
            </span>
            <div className="mt-1.5 space-y-1">
              {history.map((entry) => (
                <div key={entry.version} className="flex items-center justify-between text-[11px] tabular-nums">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-muted-foreground">v{entry.version}</span>
                    {entry.snapshot && !applyInProgress && (
                      <button
                        onClick={() => handleRestore(entry)}
                        className="rounded p-0.5 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition-colors"
                        title={`Restore to v${entry.version}`}
                      >
                        <ClockCounterClockwise size={10} weight="bold" />
                      </button>
                    )}
                  </div>
                  <span className="text-muted-foreground/70">
                    {entry.score_before}%
                    <ArrowRight size={8} className="inline mx-0.5" />
                    {entry.score_after !== null ? (
                      <span className={entry.score_after > entry.score_before ? "text-green-600" : entry.score_after < entry.score_before ? "text-red-500" : ""}>
                        {entry.score_after}%
                      </span>
                    ) : "..."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI disclaimer */}
        <div className="mt-6 flex items-start gap-1.5 px-3 pt-4 text-[11px] text-muted-foreground">
          <Sparkle size={12} weight="duotone" className="mt-0.5 shrink-0" />
          <span>AI-generated content. Hiring decisions must be made by humans.</span>
        </div>
      </nav>

      {/* Vertical divider */}
      <div className="w-px self-stretch bg-border/60" />

      {/* Content area */}
      <div className="min-w-0 flex-1">
        {activeItem === "stages" && (
          <StageBlueprint
            playbookId={playbook.id}
            stages={stages}
            onStagesChange={setStages}
            strategy={strategy}
            jd={jd}
            role={playbook.title}
            level={playbook.level ?? ""}
            industry={playbook.industry ?? ""}
            applyState={applyState}
          />
        )}

        {activeItem === "coverage" && coverageEnabled && (
          <CoverageAnalysisPanel
            playbookId={playbook.id}
            role={playbook.title}
            level={playbook.level ?? ""}
            jd={jd!}
            stages={stages}
            initialAnalysis={coverageAnalysis}
            onAnalysisChange={setCoverageAnalysis}
          />
        )}

        {activeItem === "recommendations" && recommendationsEnabled && (
          <RecommendationsPanel
            playbookId={playbook.id}
            role={playbook.title}
            level={playbook.level ?? ""}
            coverageAnalysis={coverageAnalysis!}
            stages={stages}
            initialRefinements={stageRefinements}
            onRefinementsChange={setStageRefinements}
            onApply={handleApply}
            onRestore={handleRestore}
            applyInProgress={applyInProgress}
            iterationHistory={iterationHistory}
          />
        )}
      </div>
    </div>
  );
}
