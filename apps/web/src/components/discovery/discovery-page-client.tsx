"use client";

import { useState } from "react";
import type { MarketInsights, JobDescription, HiringStrategy } from "@reconnect/database";
import { MarketIntelligencePanel } from "./market-intelligence-panel";
import { StrategyPanel } from "./strategy-panel";
import { JDStructuredEditor } from "./jd-structured-editor";

interface PlaybookData {
  id: string;
  title: string;
  department: string | null;
  level: string | null;
  industry: string | null;
  skills: string[] | null;
  location: string | null;
  market_insights: MarketInsights | null;
  job_description: JobDescription | null;
  hiring_strategy: HiringStrategy | null;
}

interface DiscoveryPageClientProps {
  playbook: PlaybookData;
}

export function DiscoveryPageClient({ playbook }: DiscoveryPageClientProps) {
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(
    playbook.market_insights,
  );
  const [strategy, setStrategy] = useState<HiringStrategy | null>(
    playbook.hiring_strategy,
  );
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(
    playbook.job_description,
  );

  return (
    <div className="space-y-6">
      <MarketIntelligencePanel
        playbookId={playbook.id}
        marketInsights={marketInsights}
        onUpdate={setMarketInsights}
      />

      <StrategyPanel
        playbookId={playbook.id}
        strategy={strategy}
        marketInsights={marketInsights}
        role={playbook.title}
        level={playbook.level ?? ""}
        industry={playbook.industry ?? ""}
        onUpdate={setStrategy}
      />

      <JDStructuredEditor
        playbookId={playbook.id}
        jobDescription={jobDescription}
        strategy={strategy}
        marketInsights={marketInsights}
        role={playbook.title}
        level={playbook.level ?? ""}
        industry={playbook.industry ?? ""}
        onUpdate={setJobDescription}
      />
    </div>
  );
}
