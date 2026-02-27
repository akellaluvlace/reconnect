"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MarketInsights, JobDescription, HiringStrategy } from "@reconnect/database";
import { MarketIntelligencePanel } from "./market-intelligence-panel";
import { StrategyPanel } from "./strategy-panel";
import { JDStructuredEditor } from "./jd-structured-editor";
import { Lock, Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Market research items that require deep research to be complete */
const DEEP_GATED_MARKET_ITEMS = new Set(["listings"]);

interface CompetitorListing {
  url: string;
  title: string;
  company: string;
  source: string;
  snippet: string;
  postedDate?: string;
  relevanceScore: number;
}

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
  competitor_listings: CompetitorListing[] | null;
}

interface DiscoveryPageClientProps {
  playbook: PlaybookData;
}

/* ── Sub-tab sections ── */
const sections = [
  { id: "market-research", name: "Market Research" },
  { id: "hiring-strategy", name: "Hiring Strategy" },
  { id: "job-description", name: "Job Description" },
] as const;

type SectionId = (typeof sections)[number]["id"];

/* ── Left-nav items per section ── */
const marketItems = [
  { id: "overview", name: "Overview" },
  { id: "skills", name: "Skills Landscape" },
  { id: "trends", name: "Market Trends" },
  { id: "sources", name: "Sources" },
  { id: "listings", name: "Competitor Listings" },
] as const;

const strategyItems = [
  { id: "classification", name: "Market Classification" },
  { id: "salary", name: "Salary Positioning" },
  { id: "speed", name: "Process Speed" },
  { id: "differentiators", name: "Differentiators" },
  { id: "skills", name: "Skills Priority" },
  { id: "risks", name: "Key Risks" },
  { id: "recommendations", name: "Recommendations" },
] as const;

const jdItems = [
  { id: "full-listing", name: "Full Listing" },
  { id: "summary", name: "Summary" },
  { id: "responsibilities", name: "Responsibilities" },
  { id: "required", name: "Required Qualifications" },
  { id: "preferred", name: "Preferred Qualifications" },
  { id: "benefits", name: "Benefits" },
  { id: "salary-range", name: "Salary Range" },
] as const;

const itemsBySection: Record<SectionId, ReadonlyArray<{ id: string; name: string }>> = {
  "market-research": marketItems,
  "hiring-strategy": strategyItems,
  "job-description": jdItems,
};

export function DiscoveryPageClient({ playbook }: DiscoveryPageClientProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("market-research");
  const [activeItems, setActiveItems] = useState<Record<SectionId, string>>({
    "market-research": "overview",
    "hiring-strategy": "classification",
    "job-description": "full-listing",
  });

  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(
    playbook.market_insights,
  );
  const [strategy, setStrategy] = useState<HiringStrategy | null>(
    playbook.hiring_strategy,
  );
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(
    playbook.job_description,
  );

  // Lifted listings state — initialized from DB, survives tab switches
  const [listings, setListings] = useState<CompetitorListing[]>(
    playbook.competitor_listings ?? [],
  );
  const [listingsCached, setListingsCached] = useState(
    (playbook.competitor_listings ?? []).length > 0,
  );

  // Lifted polling state — survives section switches
  const [isDeepResearchPolling, setIsDeepResearchPolling] = useState(false);
  const [deepResearchStartedAt, setDeepResearchStartedAt] = useState<number | null>(null);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [pollGeneration, setPollGeneration] = useState(0);

  const handlePollingStart = useCallback(() => {
    setDeepResearchStartedAt((prev) => prev ?? Date.now());
    setIsDeepResearchPolling(true);
    setPollingTimedOut(false);
  }, []);

  const handlePollingStop = useCallback(() => {
    setIsDeepResearchPolling(false);
    setDeepResearchStartedAt(null);
  }, []);

  const handleRestartPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollActiveRef.current = false;
    setPollingTimedOut(false);
    setPollGeneration((g) => g + 1);
  }, []);

  // Deep research polling — lives in parent so it survives tab switches
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollActiveRef = useRef(false);

  useEffect(() => {
    if (marketInsights?.phase !== "quick") return;
    if (pollActiveRef.current) return;

    pollActiveRef.current = true;
    handlePollingStart();
    let ticks = 0;

    pollRef.current = setInterval(async () => {
      ticks += 1;
      if (ticks > 60) {
        // 5 minutes — give up
        handlePollingStop();
        setPollingTimedOut(true);
        pollActiveRef.current = false;
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const res = await fetch(`/api/playbooks/${playbook.id}`);
        if (!res.ok) return;
        const data = await res.json();
        const mi = data.market_insights as MarketInsights | null;
        if (mi?.phase === "deep") {
          setMarketInsights(mi);
          handlePollingStop();
          pollActiveRef.current = false;
          if (pollRef.current) clearInterval(pollRef.current);
          toast.success("Deep research complete", {
            description: `${mi.sources?.length ?? 0} web sources analyzed`,
          });
        }
      } catch {
        // Silently retry
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollActiveRef.current = false;
    };
  }, [marketInsights?.phase, playbook.id, pollGeneration, handlePollingStart, handlePollingStop]);

  // Tab gating: deep research → strategy → JD
  const isDeepResearchDone = marketInsights?.phase === "deep";
  const strategyEnabled = isDeepResearchDone || strategy !== null;
  const jdEnabled = strategy !== null || jobDescription !== null;

  function isSectionEnabled(id: SectionId) {
    if (id === "market-research") return true;
    if (id === "hiring-strategy") return strategyEnabled;
    if (id === "job-description") return jdEnabled;
    return true;
  }

  function handleSectionClick(id: SectionId) {
    if (isSectionEnabled(id)) {
      setActiveSection(id);
    }
  }

  function handleItemClick(itemId: string) {
    setActiveItems((prev) => ({ ...prev, [activeSection]: itemId }));
  }

  const currentItems = itemsBySection[activeSection];
  const currentActiveItem = activeItems[activeSection];

  return (
    <div>
      {/* Sub-tabs — left-aligned */}
      <div className="flex">
        <div className="flex items-center gap-5">
          {sections.map((section) => {
            const active = activeSection === section.id;
            const enabled = isSectionEnabled(section.id);
            return (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                disabled={!enabled}
                className={cn(
                  "relative pb-2.5 text-sm font-medium transition-all",
                  active
                    ? "text-foreground"
                    : enabled
                      ? "text-muted-foreground hover:text-foreground"
                      : "cursor-not-allowed text-muted-foreground/50",
                )}
              >
                <span className="flex items-center gap-1.5">
                  {!enabled && <Lock size={12} weight="duotone" />}
                  {section.name}
                </span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Left item nav + content */}
      <div className="flex gap-6 pt-5">
        {/* Left nav */}
        <nav className="w-44 shrink-0 space-y-0.5 pt-0.5">
          {currentItems.map((item) => {
            const active = currentActiveItem === item.id;
            const gated =
              activeSection === "market-research" &&
              DEEP_GATED_MARKET_ITEMS.has(item.id) &&
              !isDeepResearchDone;
            return (
              <button
                key={item.id}
                onClick={() => !gated && handleItemClick(item.id)}
                disabled={gated}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-all",
                  gated
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {gated && <Lock size={12} weight="duotone" />}
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
          {activeSection === "market-research" && (
            <MarketIntelligencePanel
              playbookId={playbook.id}
              marketInsights={marketInsights}
              onUpdate={setMarketInsights}
              isPolling={isDeepResearchPolling}
              pollingStartedAt={deepResearchStartedAt}
              pollingTimedOut={pollingTimedOut}
              onRestartPolling={handleRestartPolling}
              role={playbook.title}
              level={playbook.level ?? ""}
              industry={playbook.industry ?? ""}
              location={playbook.location ?? "Ireland"}
              activeItem={currentActiveItem}
              listings={listings}
              listingsCached={listingsCached}
              onListingsUpdate={setListings}
              onListingsCachedUpdate={setListingsCached}
            />
          )}

          {activeSection === "hiring-strategy" && (
            <StrategyPanel
              playbookId={playbook.id}
              strategy={strategy}
              marketInsights={marketInsights}
              role={playbook.title}
              level={playbook.level ?? ""}
              industry={playbook.industry ?? ""}
              onUpdate={setStrategy}
              activeItem={currentActiveItem}
            />
          )}

          {activeSection === "job-description" && (
            <JDStructuredEditor
              playbookId={playbook.id}
              jobDescription={jobDescription}
              strategy={strategy}
              marketInsights={marketInsights}
              role={playbook.title}
              level={playbook.level ?? ""}
              industry={playbook.industry ?? ""}
              onUpdate={setJobDescription}
              activeItem={currentActiveItem}
            />
          )}
        </div>
      </div>
    </div>
  );
}
