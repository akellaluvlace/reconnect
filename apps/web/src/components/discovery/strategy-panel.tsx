"use client";

import { useEffect, useState, useRef } from "react";
import type { MarketInsights, HiringStrategy } from "@reconnect/database";
import { useAIGenerationStore, IDLE_OP } from "@/stores/ai-generation-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cleanAIText, parseNumberedItems } from "@/lib/strip-ai-metadata";
import {
  Sparkle,
  ShieldWarning,
  CircleNotch,
  Minus,
  Plus,
  Info,
  ArrowUp,
  ArrowDown,
  CheckCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { handleSessionExpired } from "@/lib/fetch-utils";

interface StrategyPanelProps {
  playbookId: string;
  strategy: HiringStrategy | null;
  marketInsights: MarketInsights | null;
  role: string;
  level: string;
  industry: string;
  onUpdate: (data: HiringStrategy) => void;
  activeItem: string;
  wizardSkills: string[];
}

const MARKET_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  employer_market: { label: "Employer's Market", color: "bg-green-100 text-green-800" },
  balanced: { label: "Balanced Market", color: "bg-blue-100 text-blue-800" },
  candidate_market: { label: "Candidate's Market", color: "bg-red-100 text-red-800" },
};

const SPEED_LABELS: Record<string, { label: string; color: string }> = {
  fast_track: { label: "Fast Track", color: "bg-orange-100 text-orange-800" },
  standard: { label: "Standard", color: "bg-blue-100 text-blue-800" },
  thorough: { label: "Thorough", color: "bg-purple-100 text-purple-800" },
};

const SALARY_LABELS: Record<string, string> = {
  lead: "Lead Market",
  match: "Match Market",
  lag: "Below Market",
};

export function StrategyPanel({
  playbookId,
  strategy,
  marketInsights,
  role,
  level,
  industry,
  onUpdate,
  activeItem,
  wizardSkills,
}: StrategyPanelProps) {
  const opKey = `strategy-${playbookId}`;
  const { status, result, error } = useAIGenerationStore(
    (s) => s.operations[opKey] ?? IDLE_OP,
  );
  const isGenerating = status === "loading";

  const [stageOverride, setStageOverride] = useState<number | null>(null);
  // Track the AI's original recommendation — survives user adjustments
  const [originalAIStages, setOriginalAIStages] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Capture AI's original recommendation on first strategy load
  const currentMaxStages = strategy?.process_speed?.max_stages ?? null;
  if (currentMaxStages != null && originalAIStages === null) {
    setOriginalAIStages(currentMaxStages);
  }
  const aiRecommendedStages = originalAIStages ?? currentMaxStages;
  const displayStages = stageOverride ?? strategy?.process_speed?.max_stages ?? 3;

  function handleStageChange(delta: number) {
    const newCount = Math.max(2, Math.min(8, displayStages + delta));
    if (newCount === displayStages) return;
    setStageOverride(newCount);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerRegenWithStages(newCount);
    }, 1500);
  }

  async function triggerRegenWithStages(stages: number) {
    if (!strategy || !marketInsights || isGenerating) return;
    setIsRegenerating(true);

    try {
      // Trade-off analysis — full context in, only process_speed out (~5-10s)
      const res = await fetch("/api/ai/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "adjust_stages",
          new_stages: stages,
          ai_recommended_stages: aiRecommendedStages ?? strategy.process_speed.max_stages,
          role,
          level,
          industry,
          market_insights: {
            salary: marketInsights.salary,
            competition: marketInsights.competition,
            time_to_hire: marketInsights.time_to_hire,
            candidate_availability: marketInsights.candidate_availability,
            key_skills: marketInsights.key_skills,
            trends: marketInsights.trends,
          },
          current_strategy: strategy,
        }),
        signal: AbortSignal.timeout(90_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("Strategy adjustment timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to adjust stages");
      }

      const { data } = await res.json();

      const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiring_strategy: data }),
      });

      if (handleSessionExpired(saveRes)) return;
      if (!saveRes.ok) {
        console.error("[strategy] Auto-save after stage adjustment failed");
        toast.error("Strategy updated but failed to save. Try refreshing.");
      }

      onUpdate(data);
      setStageOverride(null);
      toast.success(`Updated to ${stages} stages`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to adjust: ${msg}`);
    } finally {
      setIsRegenerating(false);
    }
  }

  useEffect(() => {
    if (status === "success" && result) {
      onUpdate(result as HiringStrategy);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
    if (status === "error" && error) {
      toast.error(error);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
  }, [status, result, error, onUpdate, opKey]);

  function handleGenerate() {
    if (!marketInsights) {
      toast.error("Market insights required to generate strategy");
      return;
    }

    useAIGenerationStore.getState().startOperation(opKey, async () => {
      const res = await fetch("/api/ai/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          level,
          industry,
          market_insights: {
            salary: marketInsights.salary,
            competition: marketInsights.competition,
            time_to_hire: marketInsights.time_to_hire,
            candidate_availability: marketInsights.candidate_availability,
            key_skills: marketInsights.key_skills,
            trends: marketInsights.trends,
          },
        }),
        signal: AbortSignal.timeout(90_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("Strategy generation timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate strategy");
      }

      const { data } = await res.json();

      const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiring_strategy: data }),
      });

      if (handleSessionExpired(saveRes)) return;
      if (!saveRes.ok) {
        console.error("[strategy] Auto-save failed");
        toast.error("Strategy generated but failed to save. Try refreshing the page.");
      }

      return data;
    });
  }

  if (!strategy) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        {marketInsights ? (
          <>
            <Sparkle size={24} weight="duotone" className="text-muted-foreground/40" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              Generate an AI-powered hiring strategy based on market research
            </p>
            <Button className="mt-4" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
              ) : (
                <Sparkle size={16} weight="duotone" className="mr-2" />
              )}
              Generate Strategy
            </Button>
          </>
        ) : (
          <>
            <Sparkle size={24} weight="duotone" className="text-muted-foreground/40" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              Complete market research first to generate a hiring strategy.
            </p>
          </>
        )}
      </div>
    );
  }

  const mc = MARKET_CLASS_LABELS[strategy.market_classification];
  const speed = SPEED_LABELS[strategy.process_speed.recommendation];

  return (
    <div className="space-y-4">
      {/* Header — always visible */}
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || isRegenerating || !marketInsights}
          aria-label="Regenerate strategy"
        >
          {isGenerating ? (
            <CircleNotch size={16} weight="bold" className="animate-spin" />
          ) : (
            <Sparkle size={16} weight="duotone" />
          )}
        </Button>
      </div>

      {/* ── Market Classification ── */}
      {activeItem === "classification" && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <Badge className={`text-[12px] font-semibold ${mc?.color ?? ""}`}>
            {mc?.label ?? strategy.market_classification}
          </Badge>

          {/* Supporting market data points */}
          {marketInsights && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-muted-foreground">
              <span>
                Availability: <span className="font-semibold text-foreground">{marketInsights.candidate_availability.level}</span>
              </span>
              {marketInsights.competition.job_postings_count != null && marketInsights.competition.job_postings_count > 0 && (
              <span>
                Listings found: <span className="font-semibold text-foreground">{marketInsights.competition.job_postings_count}+</span>
              </span>
              )}
              <span>
                Saturation: <span className="font-semibold text-foreground">{marketInsights.competition.market_saturation}</span>
              </span>
            </div>
          )}

          {(() => {
            const text = cleanAIText(strategy.market_classification_rationale);
            const { heading, items } = parseNumberedItems(text);
            return items.length > 1 ? (
              <div className="mt-4">
                {heading && (
                  <p className="mb-3 text-[14px] font-medium text-foreground/80">{heading}</p>
                )}
                <ol className="space-y-2 list-none">
                  {items.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                {text}
              </p>
            );
          })()}
        </div>
      )}

      {/* ── Salary Positioning ── */}
      {activeItem === "salary" && (() => {
        const rec = strategy.salary_positioning.recommended_range;
        const mkt = marketInsights?.salary;
        // Compute delta vs market median if both exist and median is non-zero
        const medianDelta = mkt && mkt.median > 0
          ? Math.round(((rec.min + rec.max) / 2 - mkt.median) / mkt.median * 100)
          : null;

        return (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <span className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[12px] font-semibold text-foreground">
            {SALARY_LABELS[strategy.salary_positioning.strategy] ??
              strategy.salary_positioning.strategy}
          </span>
          <p className="mt-4 text-[28px] font-bold tabular-nums tracking-tight">
            {rec.currency}{" "}
            {rec.min.toLocaleString()}
            {" – "}
            {rec.max.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Recommended range</p>

          {/* Market comparison */}
          {mkt && (
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2.5 text-[12px]">
              <span className="text-muted-foreground">
                Market range: <span className="font-semibold text-foreground">{mkt.currency} {mkt.min.toLocaleString()} – {mkt.max.toLocaleString()}</span>
              </span>
              {medianDelta !== null && medianDelta !== 0 && (
                <>
                  <span className="text-muted-foreground/40">|</span>
                  <span className={medianDelta > 0 ? "font-semibold text-teal-700" : "font-semibold text-amber-700"}>
                    {medianDelta > 0 ? "+" : ""}{medianDelta}% vs market median
                  </span>
                </>
              )}
            </div>
          )}

          {(() => {
            const text = cleanAIText(strategy.salary_positioning.rationale);
            const { heading, items } = parseNumberedItems(text);
            return items.length > 1 ? (
              <div className="mt-4">
                {heading && (
                  <p className="mb-3 text-[14px] font-medium text-foreground/80">{heading}</p>
                )}
                <ol className="space-y-2 list-none">
                  {items.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground/60">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                {text}
              </p>
            );
          })()}
        </div>
        );
      })()}

      {/* ── Process Speed ── */}
      {activeItem === "speed" && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm space-y-6">
          <Badge className={`text-[12px] font-semibold ${speed?.color ?? ""}`}>
            {speed?.label ?? strategy.process_speed.recommendation}
          </Badge>

          {/* ── Metrics row ── */}
          <div className="grid grid-cols-2 gap-5">
            {/* Stage stepper */}
            <div className="rounded-xl border border-border/30 bg-muted/30 px-6 py-5 text-center">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Interview stages
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0 shadow-sm"
                  onClick={() => handleStageChange(-1)}
                  disabled={displayStages <= 2 || isRegenerating || isGenerating}
                  aria-label="Decrease stages"
                >
                  <Minus size={14} weight="bold" />
                </Button>
                <p className="w-10 text-center text-[28px] font-bold tabular-nums text-foreground">
                  {isRegenerating ? (
                    <CircleNotch size={26} weight="bold" className="inline animate-spin text-teal-600" />
                  ) : (
                    displayStages
                  )}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0 shadow-sm"
                  onClick={() => handleStageChange(1)}
                  disabled={displayStages >= 8 || isRegenerating || isGenerating}
                  aria-label="Increase stages"
                >
                  <Plus size={14} weight="bold" />
                </Button>
              </div>
              {aiRecommendedStages != null && displayStages !== aiRecommendedStages && (
                <p className="mt-3 text-[12px] text-teal-600">
                  <Sparkle size={11} weight="duotone" className="mr-1 inline" />
                  AI recommends {aiRecommendedStages}
                </p>
              )}
            </div>

            {/* Target days */}
            <div className="rounded-xl border border-border/30 bg-muted/30 px-6 py-5 text-center">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Target timeline
              </p>
              <p className="text-[28px] font-bold tabular-nums text-foreground">
                {strategy.process_speed.target_days}
                <span className="ml-1 text-[14px] font-normal text-muted-foreground">days</span>
              </p>
              {marketInsights?.time_to_hire && (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Market average: ~{marketInsights.time_to_hire.average_days} days
                </p>
              )}
            </div>
          </div>

          {/* ── Rationale + Trade-off (or skeleton pulse while loading) ── */}
          {isRegenerating || stageOverride !== null ? (
            <div className="space-y-5 animate-pulse">
              {/* Rationale skeleton */}
              <div className="rounded-xl border border-border/20 bg-muted/20 px-5 py-4 space-y-2.5">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-3.5 w-full rounded bg-muted" />
                <div className="h-3.5 w-4/5 rounded bg-muted" />
              </div>

              {/* Divider skeleton */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/30" />
                <div className="h-3 w-48 rounded bg-muted" />
                <div className="h-px flex-1 bg-border/30" />
              </div>

              {/* Gains / Risks skeleton */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-teal-100/50 bg-teal-50/20 p-5 space-y-3">
                  <div className="h-3 w-28 rounded bg-teal-100" />
                  <div className="h-3.5 w-full rounded bg-teal-100/60" />
                  <div className="h-3.5 w-3/4 rounded bg-teal-100/60" />
                </div>
                <div className="rounded-xl border border-rose-100/50 bg-rose-50/15 p-5 space-y-3">
                  <div className="h-3 w-24 rounded bg-rose-100" />
                  <div className="h-3.5 w-full rounded bg-rose-100/60" />
                  <div className="h-3.5 w-3/4 rounded bg-rose-100/60" />
                </div>
              </div>

              {/* Suggestion skeleton */}
              <div className="rounded-xl border border-border/10 bg-muted/10 px-5 py-4 space-y-2">
                <div className="h-3 w-32 rounded bg-muted" />
                <div className="h-3.5 w-full rounded bg-muted/80" />
                <div className="h-3.5 w-2/3 rounded bg-muted/80" />
              </div>
            </div>
          ) : (
            <>
              {/* Rationale */}
              <div className="rounded-xl border border-border/20 bg-muted/20 px-5 py-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {strategy.process_speed.trade_off ? "Summary" : "AI Analysis"}
                </p>
                <p className="text-[14px] leading-[1.7] text-foreground/70">
                  {cleanAIText(strategy.process_speed.rationale)}
                </p>
              </div>

              {/* Trade-off panel */}
              {strategy.process_speed.trade_off && (
                <div className="space-y-4">
                  {(() => {
                    const isDeviated = aiRecommendedStages != null && strategy.process_speed.max_stages !== aiRecommendedStages;
                    const label = isDeviated
                      ? `Impact of changing ${aiRecommendedStages} → ${strategy.process_speed.max_stages} stages`
                      : `Why ${strategy.process_speed.max_stages} stages for this role`;
                    return (
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border/40" />
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {label}
                        </p>
                        <div className="h-px flex-1 bg-border/40" />
                      </div>
                    );
                  })()}

                  {(() => {
                    const isDeviated = aiRecommendedStages != null && displayStages !== aiRecommendedStages;
                    const gainsLabel = !isDeviated
                      ? "What this enables"
                      : displayStages > aiRecommendedStages ? "What you gain" : "What you save";
                    const risksLabel = !isDeviated
                      ? "What to watch"
                      : displayStages > aiRecommendedStages ? "What it costs" : "What you lose";
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Gains */}
                        <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-5">
                          <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-teal-800">
                            <ArrowUp size={14} weight="bold" />
                            {gainsLabel}
                          </p>
                          <ul className="space-y-2.5">
                            {strategy.process_speed.trade_off.gains.map((g, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-teal-900/80">
                                <CheckCircle size={15} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
                                <span>{g}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Risks */}
                        <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-5">
                          <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-rose-800">
                            <ShieldWarning size={14} weight="duotone" />
                            {risksLabel}
                          </p>
                          <ul className="space-y-2.5">
                            {strategy.process_speed.trade_off.risks.map((r, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-rose-900/70">
                                <Info size={15} weight="duotone" className="mt-0.5 shrink-0 text-rose-400" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Suggestion */}
                  <div className="rounded-xl border border-teal-900/10 bg-teal-950/[0.03] px-5 py-4">
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-teal-800/60">
                      Recommendation
                    </p>
                    <p className="text-[14px] leading-[1.7] text-foreground/80">
                      {strategy.process_speed.trade_off.suggestion}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Competitive Differentiators ── */}
      {activeItem === "differentiators" && (
        <div className="space-y-3">
          {strategy.competitive_differentiators.map((d, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-border/40 bg-card p-5 shadow-sm"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[11px] font-bold text-teal-700">
                {i + 1}
              </span>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                {cleanAIText(d)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Skills Priority ── */}
      {activeItem === "skills" && (() => {
        // Build sets for O(1) lookup of market skills
        const marketRequired = new Set(
          (marketInsights?.key_skills?.required ?? []).map((s) => s.toLowerCase()),
        );
        const marketEmerging = new Set(
          (marketInsights?.key_skills?.emerging ?? []).map((s) => s.toLowerCase()),
        );

        function skillTag(skill: string) {
          const lower = skill.toLowerCase();
          if (marketRequired.has(lower)) {
            return <span className="ml-1.5 rounded bg-teal-100 px-1 py-0.5 text-[10px] font-bold uppercase leading-none text-teal-800">In demand</span>;
          }
          if (marketEmerging.has(lower)) {
            return <span className="ml-1.5 rounded bg-green-100 px-1 py-0.5 text-[10px] font-bold uppercase leading-none text-green-800">Emerging</span>;
          }
          return null;
        }

        // Build set of user-provided skills for comparison
        const userSkillsSet = new Set(
          wizardSkills.map((s) => s.toLowerCase().trim()),
        );

        function isAISuggested(skill: string) {
          return !userSkillsSet.has(skill.toLowerCase().trim());
        }

        // Vagueness detection
        const isVagueInput = wizardSkills.length < 3
          || wizardSkills.every((s) => s.trim().length < 8 && !s.includes(" "));

        // Count AI-suggested skills across all categories
        const allStrategySkills = [
          ...strategy.skills_priority.must_have,
          ...strategy.skills_priority.nice_to_have,
          ...strategy.skills_priority.emerging_premium,
        ];
        const aiSuggestedCount = allStrategySkills.filter(isAISuggested).length;
        const showCaveatBanner = isVagueInput && aiSuggestedCount > allStrategySkills.length * 0.5;

        return (
        <div className="space-y-5">
          {showCaveatBanner && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
              <Sparkle size={14} weight="duotone" className="mt-0.5 shrink-0" />
              <span>
                Some skills were suggested based on limited input. Add more specific skills in the playbook wizard for more accurate results.
              </span>
            </div>
          )}
          <div>
            <p className="mb-3 text-[13px] font-semibold text-red-700">Must Have</p>
            <div className="flex flex-wrap gap-2">
              {strategy.skills_priority.must_have.map((s) => (
                <span
                  key={s}
                  className={cn(
                    "flex items-center rounded-md border bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-800",
                    isAISuggested(s) ? "border-dashed border-red-300" : "border-red-200",
                  )}
                >
                  {isAISuggested(s) && <Sparkle size={12} weight="duotone" className="mr-1.5 opacity-60" />}
                  {s}{skillTag(s)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-[13px] font-semibold text-foreground">Nice to Have</p>
            <div className="flex flex-wrap gap-2">
              {strategy.skills_priority.nice_to_have.map((s) => (
                <span
                  key={s}
                  className={cn(
                    "flex items-center rounded-md border bg-muted/40 px-3 py-1.5 text-[13px] font-medium text-foreground",
                    isAISuggested(s) ? "border-dashed border-border" : "border-border/60",
                  )}
                >
                  {isAISuggested(s) && <Sparkle size={12} weight="duotone" className="mr-1.5 opacity-60" />}
                  {s}{skillTag(s)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-[13px] font-semibold text-green-700">Emerging Premium</p>
            <div className="flex flex-wrap gap-2">
              {strategy.skills_priority.emerging_premium.map((s) => (
                <span
                  key={s}
                  className={cn(
                    "flex items-center rounded-md border bg-green-50 px-3 py-1.5 text-[13px] font-medium text-green-800",
                    isAISuggested(s) ? "border-dashed border-green-300" : "border-green-200",
                  )}
                >
                  {isAISuggested(s) && <Sparkle size={12} weight="duotone" className="mr-1.5 opacity-60" />}
                  {s}{skillTag(s)}
                </span>
              ))}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── Key Risks ── */}
      {activeItem === "risks" && (
        <>
          {strategy.key_risks.length > 0 ? (
            <div className="space-y-3">
              {strategy.key_risks.map((r, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <ShieldWarning size={16} weight="duotone" className="mt-0.5 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-[14px] font-semibold text-foreground">{cleanAIText(r.risk)}</p>
                      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-teal-700">Mitigation:</span> {cleanAIText(r.mitigation)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[14px] text-muted-foreground">No key risks identified.</p>
          )}
        </>
      )}

      {/* ── Recommendations ── */}
      {activeItem === "recommendations" && (
        <>
          {strategy.recommendations.length > 0 ? (
            <div className="space-y-3">
              {strategy.recommendations.map((r, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-xl border border-border/40 bg-card p-5 shadow-sm"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-[11px] font-bold text-gold-600">
                    {i + 1}
                  </span>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    {cleanAIText(r)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[14px] text-muted-foreground">No recommendations available.</p>
          )}
        </>
      )}
    </div>
  );
}
