"use client";

import { useState } from "react";
import type {
  HiringStrategy,
  JobDescription,
  FocusArea,
  SuggestedQuestion,
} from "@reconnect/database";
import { StageBlueprint } from "./stage-blueprint";
import { CoverageAnalysisPanel } from "./coverage-analysis-panel";
import { Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
          />
        )}

        {activeItem === "coverage" && coverageEnabled && (
          <CoverageAnalysisPanel
            playbookId={playbook.id}
            role={playbook.title}
            level={playbook.level ?? ""}
            jd={jd!}
            stages={stages}
          />
        )}
      </div>
    </div>
  );
}
