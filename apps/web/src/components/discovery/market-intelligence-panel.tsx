"use client";

import { useState, useEffect, useRef } from "react";
import type { MarketInsights } from "@reconnect/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhaseBadge } from "@/components/ai/phase-badge";
import { DeepResearchProgress } from "./deep-research-progress";
import { stripAIMetadata } from "@/lib/strip-ai-metadata";
import {
  UsersThree,
  Buildings,
  Lightning,
  ArrowsClockwise,
  CircleNotch,
  CurrencyDollar,
  Clock,
  Globe,
  ArrowSquareOut,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { toast } from "sonner";

interface CompetitorListing {
  url: string;
  title: string;
  company: string;
  source: string;
  snippet: string;
  postedDate?: string;
  relevanceScore: number;
}

interface MarketIntelligencePanelProps {
  playbookId: string;
  marketInsights: MarketInsights | null;
  onUpdate: (data: MarketInsights) => void;
  isPolling: boolean;
  onPollingStart: () => void;
  onPollingStop: () => void;
  pollingStartedAt: number | null;
  role: string;
  level: string;
  industry: string;
  location: string;
  activeItem: string;
  listings: CompetitorListing[];
  listingsCached: boolean;
  onListingsUpdate: (listings: CompetitorListing[]) => void;
  onListingsCachedUpdate: (cached: boolean) => void;
}

export function MarketIntelligencePanel({
  playbookId,
  marketInsights,
  onUpdate,
  isPolling,
  onPollingStart,
  onPollingStop,
  pollingStartedAt,
  role,
  level,
  industry,
  location,
  activeItem,
  listings,
  listingsCached,
  onListingsUpdate,
  onListingsCachedUpdate,
}: MarketIntelligencePanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const MAX_POLL_ATTEMPTS = 60;

  // Poll for deep research completion when in quick phase
  useEffect(() => {
    if (marketInsights?.phase !== "quick" || isPolling) return;

    onPollingStart();
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        onPollingStop();
        setPollingTimedOut(true);
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const res = await fetch(`/api/playbooks/${playbookId}`);
        if (!res.ok) return;
        const data = await res.json();
        const mi = data.market_insights as MarketInsights | null;
        if (mi?.phase === "deep") {
          onUpdate(mi);
          onPollingStop();
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
    };
  }, [marketInsights?.phase, playbookId, onUpdate, isPolling, onPollingStart, onPollingStop]);

  if (!marketInsights) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <Globe size={24} weight="duotone" className="text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No market insights available. Complete the playbook wizard to generate initial insights.
        </p>
      </div>
    );
  }

  const mi = marketInsights;

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/playbooks/${playbookId}`);
      if (!res.ok) throw new Error("Failed to refresh");
      const data = await res.json();
      if (data.market_insights) {
        onUpdate(data.market_insights as MarketInsights);
      }
    } catch {
      toast.error("Failed to refresh market data");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRetryDeepResearch() {
    setIsRetrying(true);
    setPollingTimedOut(false);
    try {
      // Re-call quick insights endpoint to get the cache_key (uses cache, no AI cost)
      const res = await fetch("/api/ai/market-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, level, industry, location, market_focus: "irish" }),
      });

      if (!res.ok) throw new Error("Failed to get cache key");
      const data = await res.json();

      if (!data.cache_key) throw new Error("No cache key returned");

      // Trigger deep research
      const deepRes = await fetch(`/api/ai/market-insights/${data.cache_key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbook_id: playbookId }),
      });

      if (!deepRes.ok) throw new Error("Failed to trigger deep research");

      // Restart polling directly — can't rely on useEffect because
      // isPolling guard would return early
      pollCountRef.current = 0;
      onPollingStart();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        pollCountRef.current += 1;
        if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
          onPollingStop();
          setPollingTimedOut(true);
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }
        try {
          const pollRes = await fetch(`/api/playbooks/${playbookId}`);
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();
          const mi = pollData.market_insights as MarketInsights | null;
          if (mi?.phase === "deep") {
            onUpdate(mi);
            onPollingStop();
            if (pollRef.current) clearInterval(pollRef.current);
            toast.success("Deep research complete", {
              description: `${mi.sources?.length ?? 0} web sources analyzed`,
            });
          }
        } catch {
          // Silently retry on network errors
        }
      }, 5000);

      toast.success("Deep research restarted");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to retry deep research: ${message}`);
      setPollingTimedOut(true);
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleFetchListings() {
    setIsLoadingListings(true);
    setListingsError(null);
    try {
      const res = await fetch("/api/ai/competitor-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          level,
          industry,
          location,
          playbook_id: playbookId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      const fetchedListings = data.listings ?? [];
      onListingsUpdate(fetchedListings);
      onListingsCachedUpdate(data.cached ?? false);

      // Persist to playbook so it survives navigation
      if (fetchedListings.length > 0) {
        fetch(`/api/playbooks/${playbookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitor_listings: { listings: fetchedListings, generated_at: data.generated_at },
          }),
        }).then((saveRes) => {
          if (!saveRes.ok) {
            console.error("[competitor-listings] Save failed:", saveRes.status);
            toast.error("Listings fetched but failed to save. They may not persist on reload.");
          }
        }).catch((err) =>
          console.error("[competitor-listings] Failed to save to playbook:", err),
        );
      }

      if (data.cached) {
        toast.info("Showing cached listings", {
          description: "Results from a previous search",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setListingsError(message);
      toast.error(`Failed to fetch listings: ${message}`);
    } finally {
      setIsLoadingListings(false);
    }
  }

  const availabilityText = stripAIMetadata(
    mi.candidate_availability.description ?? "",
  );

  return (
    <div className="space-y-4">
      {/* Header — always visible */}
      <div className="flex items-center justify-between">
        <PhaseBadge phase={mi.phase} isResearching={isPolling} />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh market data"
        >
          <ArrowsClockwise
            size={16}
            weight="duotone"
            className={isRefreshing ? "animate-spin" : ""}
          />
        </Button>
      </div>

      {/* Deep research progress — always visible when in quick phase */}
      {mi.phase === "quick" && (
        <>
          <DeepResearchProgress isActive={isPolling} startedAt={pollingStartedAt} />
          {pollingTimedOut && !isPolling && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm text-amber-800">
                Deep research is taking longer than expected. It may have been interrupted.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleRetryDeepResearch}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
                ) : (
                  <ArrowsClockwise size={16} weight="duotone" className="mr-2" />
                )}
                Retry Deep Research
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Overview: Salary + Time to Hire (2-col), Availability (full), Competition (full) ── */}
      {activeItem === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Salary Range */}
            <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CurrencyDollar size={16} weight="duotone" className="text-teal-600" />
                <p className="text-[13px] font-medium text-muted-foreground">Salary Range</p>
              </div>
              <p className="text-[28px] font-bold tabular-nums tracking-tight">
                {mi.salary.currency} {mi.salary.median.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Median salary</p>
              <div className="mt-5">
                <div className="relative h-2.5 rounded-full bg-muted/80">
                  <div
                    className="absolute inset-y-0 rounded-full bg-gradient-to-r from-teal-200 to-teal-400"
                    style={{ left: "0%", right: "0%" }}
                  />
                  {mi.salary.max > mi.salary.min && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-4 w-1.5 rounded-full bg-teal-600 shadow-sm"
                      style={{
                        left: `${((mi.salary.median - mi.salary.min) / (mi.salary.max - mi.salary.min)) * 100}%`,
                      }}
                    />
                  )}
                </div>
                <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
                  <span>{mi.salary.currency} {mi.salary.min.toLocaleString()}</span>
                  <span>{mi.salary.currency} {mi.salary.max.toLocaleString()}</span>
                </div>
              </div>
              {mi.salary.confidence && (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Confidence: <span className="font-semibold text-foreground">{mi.salary.confidence}</span>
                </p>
              )}
            </div>

            {/* Time to Hire */}
            <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} weight="duotone" className="text-blue-500" />
                <p className="text-[13px] font-medium text-muted-foreground">Time to Hire</p>
              </div>
              <p className="text-[28px] font-bold tabular-nums tracking-tight">
                ~{mi.time_to_hire.average_days} <span className="text-base font-medium text-muted-foreground">days</span>
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Average hiring timeline</p>
              <div className="mt-5 flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                <div className="text-center">
                  <p className="text-lg font-semibold tabular-nums">{mi.time_to_hire.range.min}</p>
                  <p className="text-[11px] text-muted-foreground">Fastest</p>
                </div>
                <div className="h-8 w-px bg-border/60" />
                <div className="text-center">
                  <p className="text-lg font-semibold tabular-nums">{mi.time_to_hire.range.max}</p>
                  <p className="text-[11px] text-muted-foreground">Slowest</p>
                </div>
              </div>
            </div>
          </div>

          {/* Candidate Availability */}
          <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UsersThree size={16} weight="duotone" className="text-orange-500" />
                <p className="text-[13px] font-medium text-muted-foreground">Candidate Availability</p>
              </div>
              <Badge
                variant="outline"
                className={`text-[12px] font-semibold ${
                  mi.candidate_availability.level === "scarce"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : mi.candidate_availability.level === "limited"
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : mi.candidate_availability.level === "moderate"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {mi.candidate_availability.level}
              </Badge>
            </div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {availabilityText}
            </p>
          </div>

          {/* Competition */}
          <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Buildings size={16} weight="duotone" className="text-purple-500" />
              <p className="text-[13px] font-medium text-muted-foreground">Competition</p>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-[28px] font-bold tabular-nums tracking-tight">
                {mi.competition.job_postings_count}
              </p>
              <p className="text-[14px] text-muted-foreground">
                active postings &middot; {mi.competition.market_saturation} saturation
              </p>
            </div>
            {mi.competition.companies_hiring.length > 0 && (
              <div className="mt-4">
                <p className="mb-2.5 text-[12px] font-medium text-muted-foreground">Companies hiring</p>
                <div className="flex flex-wrap gap-2">
                  {mi.competition.companies_hiring.map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[13px] font-medium text-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Skills Landscape ── */}
      {activeItem === "skills" && (
        <div className="space-y-5">
          {mi.key_skills.required.length > 0 && (
            <div>
              <p className="mb-3 text-[13px] font-semibold text-foreground">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {mi.key_skills.required.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-[13px] font-medium text-teal-800"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {mi.key_skills.emerging.length > 0 && (
            <div>
              <p className="mb-3 text-[13px] font-semibold text-foreground">Emerging Skills</p>
              <div className="flex flex-wrap gap-2">
                {mi.key_skills.emerging.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-[13px] font-medium text-green-800"
                  >
                    {s}
                    <span className="rounded bg-green-200 px-1 py-0.5 text-[10px] font-bold uppercase leading-none text-green-900">New</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {mi.key_skills.declining.length > 0 && (
            <div>
              <p className="mb-3 text-[13px] font-semibold text-muted-foreground">Declining</p>
              <div className="flex flex-wrap gap-2">
                {mi.key_skills.declining.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-border/60 px-3 py-1.5 text-[13px] text-muted-foreground line-through"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Market Trends ── */}
      {activeItem === "trends" && (() => {
        const cleanTrends = mi.trends
          .map((t) => stripAIMetadata(t))
          .filter((t) => t.length > 0);
        return cleanTrends.length > 0 ? (
          <div className="space-y-3">
            {cleanTrends.map((t, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-border/40 bg-card p-5 shadow-sm"
              >
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[11px] font-bold text-teal-700">
                  {i + 1}
                </span>
                <p className="text-[14px] leading-relaxed text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-[14px] text-muted-foreground">No trend data available yet.</p>
        );
      })()}

      {/* ── Sources ── */}
      {activeItem === "sources" && (
        <>
          {mi.sources && mi.sources.length > 0 ? (
            <div className="divide-y divide-border/60 rounded-xl border border-border/40 bg-card shadow-sm">
              {mi.sources.map((source, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1.5 text-[14px] font-medium text-foreground"
                    >
                      <span className="truncate group-hover:underline">{source.title}</span>
                      <ArrowSquareOut size={12} className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {source.url}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted/60 px-2 py-1 text-[11px] tabular-nums text-muted-foreground" title="Relevance score">
                    <span className="font-normal">Relevance</span>{" "}
                    <span className="font-semibold">{Math.round(source.relevance_score * 100)}%</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 py-12 text-center">
              <Globe size={24} weight="duotone" className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-[14px] text-muted-foreground">
                Sources will appear after deep research completes.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Competitor Listings ── */}
      {activeItem === "listings" && (
        <div className="space-y-4">
          {/* Fetch button */}
          {listings.length === 0 && !isLoadingListings && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
              <Buildings size={24} weight="duotone" className="text-muted-foreground/40" />
              <p className="mt-3 text-[14px] text-muted-foreground">
                Search job boards for competitor listings in your market.
              </p>
              {listingsError && (
                <p className="mt-2 text-[13px] text-red-600">{listingsError}</p>
              )}
              <Button
                className="mt-4"
                onClick={handleFetchListings}
              >
                <MagnifyingGlass size={16} weight="duotone" className="mr-2" />
                Search Competitor Listings
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isLoadingListings && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-card py-16 shadow-sm">
              <CircleNotch size={24} weight="bold" className="animate-spin text-teal-600" />
              <p className="mt-3 text-[14px] text-muted-foreground">
                Searching job boards...
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                This typically takes 3-5 seconds
              </p>
            </div>
          )}

          {/* Results */}
          {listings.length > 0 && !isLoadingListings && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-muted-foreground">
                  {listings.length} listing{listings.length !== 1 ? "s" : ""} found
                  {listingsCached && (
                    <span className="ml-1.5 text-[12px] text-muted-foreground/70">(cached)</span>
                  )}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFetchListings}
                  disabled={isLoadingListings}
                >
                  <ArrowsClockwise size={16} weight="duotone" />
                </Button>
              </div>

              <div className="space-y-3">
                {listings.map((listing, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/40 bg-card p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-teal-600 hover:text-teal-700"
                        >
                          <span className="group-hover:underline">{listing.title}</span>
                          <ArrowSquareOut size={12} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                        </a>
                        <p className="mt-1 text-[13px] font-semibold text-foreground">
                          {listing.company}
                        </p>
                        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                          {listing.snippet}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {listing.source}
                          </span>
                          {listing.postedDate && (
                            <span className="text-[11px] text-muted-foreground">
                              {listing.postedDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-muted/60 px-2 py-1 text-[11px] tabular-nums text-muted-foreground" title="Relevance score">
                        <span className="font-normal">Relevance</span>{" "}
                        <span className="font-semibold">{Math.round(listing.relevanceScore * 100)}%</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
