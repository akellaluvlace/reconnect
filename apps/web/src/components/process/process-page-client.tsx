"use client";

import { useState, useCallback } from "react";
import type {
  HiringStrategy,
  JobDescription,
  CoverageAnalysis,
  FocusArea,
  SuggestedQuestion,
} from "@reconnect/database";
import { StageBlueprint } from "./stage-blueprint";
import { CoverageAnalysisPanel } from "./coverage-analysis-panel";
import { Sparkle, CircleNotch, CheckCircle, LockOpen, Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

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
    status: string;
    level: string | null;
    industry: string | null;
    job_description: JobDescription | null;
    hiring_strategy: HiringStrategy | null;
    market_insights: Record<string, unknown> | null;
    coverage_analysis: CoverageAnalysis | null;
  };
  initialStages: StageData[];
}

const processItems = [
  { id: "stages", name: "Interview Stages" },
  { id: "coverage", name: "Coverage Analysis" },
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

  // Track whether stages have been edited since last coverage analysis
  const [stagesChangedSinceCoverage, setStagesChangedSinceCoverage] = useState(false);

  const handleStagesChange = useCallback((updated: StageData[]) => {
    setStages(updated);
    if (coverageAnalysis) {
      setStagesChangedSinceCoverage(true);
    }
  }, [coverageAnalysis]);

  const handleCoverageChange = useCallback((analysis: CoverageAnalysis) => {
    setCoverageAnalysis(analysis);
    setStagesChangedSinceCoverage(false);
  }, []);

  const [playbookStatus, setPlaybookStatus] = useState(playbook.status);
  const [isFinalizing, setIsFinalizing] = useState(false);

  async function handleFinalize() {
    setIsFinalizing(true);
    try {
      // Persist status + latest coverage in one PATCH
      const payload: Record<string, unknown> = { status: "active" };
      if (coverageAnalysis) {
        payload.coverage_analysis = coverageAnalysis;
      }
      console.log(`[process] Lock in { stages=${stages.length}, coverageScore=${coverageAnalysis?.overall_coverage_score ?? "none"} }`);
      const res = await fetch(`/api/playbooks/${playbook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) throw new Error("Failed to finalize process");
      setPlaybookStatus("active");
      toast.success("Locked in! Your process is ready to go");
    } catch (err) {
      console.error("[process] Finalize failed:", err);
      toast.error("Failed to finalize process");
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleUnfinalize() {
    setIsFinalizing(true);
    try {
      const res = await fetch(`/api/playbooks/${playbook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) throw new Error("Failed to update status");
      setPlaybookStatus("draft");
      toast.success("Process unlocked for editing");
    } catch (err) {
      console.error("[process] Unfinalize failed:", err);
      toast.error("Failed to update status");
    } finally {
      setIsFinalizing(false);
    }
  }

  const strategy = playbook.hiring_strategy;
  const jd = playbook.job_description;

  const coverageEnabled = stages.length > 0 && jd !== null;

  return (
    <div className="flex gap-6">
      {/* Left nav */}
      <nav className="w-44 shrink-0 space-y-0.5 pt-0.5">
        {processItems.map((item) => {
          const active = activeItem === item.id;
          const enabled = item.id === "coverage" ? coverageEnabled : true;
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
            </button>
          );
        })}

        {/* AI disclaimer */}
        <div className="mt-6 flex items-start gap-1.5 px-3 pt-4 text-[11px] text-muted-foreground">
          <Sparkle size={12} weight="duotone" className="mt-0.5 shrink-0" />
          <span>AI-generated content. Hiring decisions must be made by humans.</span>
        </div>

        {/* Lock-in button */}
        {stages.length > 0 && (
          <div className="mt-4 px-3">
            {playbookStatus === "active" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 rounded-md bg-green-50 border border-green-200 px-3 py-2">
                  <CheckCircle size={14} weight="fill" className="text-green-600 shrink-0" />
                  <span className="text-[12px] font-medium text-green-800">Locked in — you're all set</span>
                </div>
                <button
                  onClick={handleUnfinalize}
                  disabled={isFinalizing}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <LockOpen size={10} />
                  Unlock for editing
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isFinalizing ? (
                  <CircleNotch size={14} weight="bold" className="mr-1.5 animate-spin" />
                ) : (
                  <Lock size={14} weight="fill" className="mr-1.5" />
                )}
                Lock your process
              </Button>
            )}
          </div>
        )}
      </nav>

      {/* Vertical divider */}
      <div className="w-px self-stretch bg-border/60" />

      {/* Content area */}
      <div className="min-w-0 flex-1">
        {activeItem === "stages" && (
          <StageBlueprint
            playbookId={playbook.id}
            stages={stages}
            onStagesChange={handleStagesChange}
            strategy={strategy}
            jd={jd}
            role={playbook.title}
            level={playbook.level ?? ""}
            industry={playbook.industry ?? ""}
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
            onAnalysisChange={handleCoverageChange}
            stagesChanged={stagesChangedSinceCoverage}
          />
        )}
      </div>
    </div>
  );
}
