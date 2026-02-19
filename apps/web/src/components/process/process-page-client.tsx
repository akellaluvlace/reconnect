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

export function ProcessPageClient({
  playbook,
  initialStages,
}: ProcessPageClientProps) {
  const [stages, setStages] = useState<StageData[]>(initialStages);

  const strategy = playbook.hiring_strategy;
  const jd = playbook.job_description;

  return (
    <div className="space-y-6">
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

      {stages.length > 0 && jd && (
        <CoverageAnalysisPanel
          role={playbook.title}
          level={playbook.level ?? ""}
          jd={jd}
          stages={stages}
        />
      )}
    </div>
  );
}
