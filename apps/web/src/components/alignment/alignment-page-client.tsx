"use client";

import { useState, useMemo } from "react";
import type {
  HiringStrategy,
  CandidateProfile,
  MarketInsights,
  CoverageAnalysis,
  FocusArea,
} from "@reconnect/database";
import { CandidateProfileBuilder } from "./candidate-profile-builder";
import { ProcessSummary } from "./process-summary";
import { CollaboratorManager } from "./collaborator-manager";
import { ShareableLink } from "./shareable-link";
import {
  Sparkle,
  Clock,
  UsersThree,
  LinkSimple,
  Question,
  CheckCircle,
  Circle,
  Rocket,
  WarningCircle,
  Lightbulb,
} from "@phosphor-icons/react";
import {
  getDurationWarnings,
  getProcessHealthWarnings,
  getCompetitiveInsights,
} from "./alignment-warnings";
import { cn } from "@/lib/utils";

export interface StageInfo {
  id: string;
  name: string;
  type: string;
  duration_minutes: number;
  order_index: number;
  focus_areas: FocusArea[] | null;
  questions: Array<{
    question: string;
    purpose: string;
    focus_area?: string;
    look_for?: string[];
  }> | null;
}

export interface CollaboratorData {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  assigned_stages: string[] | null;
  expires_at: string;
  accepted_at: string | null;
  invite_token: string | null;
  created_at: string | null;
}

export interface ShareLinkData {
  id: string;
  token: string;
  is_active: boolean | null;
  expires_at: string | null;
  view_count: number | null;
  created_at: string | null;
}

interface AlignmentPageClientProps {
  playbook: {
    id: string;
    title: string;
    level: string | null;
    industry: string | null;
    skills: string[] | null;
    hiring_strategy: HiringStrategy | null;
    candidate_profile: CandidateProfile | null;
    market_insights: MarketInsights | null;
    status: string | null;
  };
  strategyGeneratedAt: string | null;
  coverageAnalysis: CoverageAnalysis | null;
  initialStages: StageInfo[];
  initialCollaborators: CollaboratorData[];
  initialShareLinks: ShareLinkData[];
}

const setupItems = [
  { id: "profile", name: "Candidate Profile", Icon: Sparkle },
  { id: "process", name: "Process Summary", Icon: Clock },
] as const;

const collaborateItems = [
  { id: "collaborators", name: "Collaborators", Icon: UsersThree },
  { id: "share-links", name: "Share Links", Icon: LinkSimple },
] as const;

export function AlignmentPageClient({
  playbook,
  strategyGeneratedAt,
  coverageAnalysis,
  initialStages,
  initialCollaborators,
  initialShareLinks,
}: AlignmentPageClientProps) {
  const [candidateProfile, setCandidateProfile] =
    useState<CandidateProfile | null>(playbook.candidate_profile);
  const [collaborators, setCollaborators] =
    useState<CollaboratorData[]>(initialCollaborators);
  const [shareLinks, setShareLinks] =
    useState<ShareLinkData[]>(initialShareLinks);
  const [activeItem, setActiveItem] = useState("profile");
  const [showGuide, setShowGuide] = useState(false);

  // Stale detection: strategy newer than profile
  const isProfileStale = (() => {
    if (!candidateProfile || !strategyGeneratedAt) return false;
    const profileAt = candidateProfile.generated_at;
    if (!profileAt) return false;
    return new Date(strategyGeneratedAt) > new Date(profileAt);
  })();

  // Readiness checklist
  const readinessItems = [
    { label: "Candidate profile generated", done: candidateProfile !== null, section: "profile" as const, required: true },
    { label: "Process finalized", done: playbook.status === "active", section: "process" as const, required: true },
    { label: "Collaborators invited", done: collaborators.length > 0, section: "collaborators" as const, required: true },
    {
      label: "All stages have interviewers",
      done: initialStages.length > 0 && initialStages.every(
        (s) => collaborators.some(
          (c) => !c.assigned_stages || c.assigned_stages.length === 0 || c.assigned_stages.includes(s.id),
        ),
      ),
      section: "collaborators" as const,
      required: false,
    },
    { label: "Share link created", done: shareLinks.length > 0, section: "share-links" as const, required: false },
  ];
  const requiredDone = readinessItems.filter((i) => i.required).every((i) => i.done);
  const allDone = readinessItems.every((i) => i.done);

  // Process health & competitive insights
  const durationWarnings = useMemo(
    () => getDurationWarnings(initialStages),
    [initialStages],
  );
  const healthWarnings = useMemo(
    () => getProcessHealthWarnings(initialStages, collaborators),
    [initialStages, collaborators],
  );
  const competitiveInsights = useMemo(
    () => getCompetitiveInsights(
      playbook.market_insights as Parameters<typeof getCompetitiveInsights>[0],
      playbook.hiring_strategy as Parameters<typeof getCompetitiveInsights>[1],
    ),
    [playbook.market_insights, playbook.hiring_strategy],
  );
  const allWarnings = [...durationWarnings, ...healthWarnings];

  // Build stage_types summary for enriched profile prompt
  const stageTypesSummary = (() => {
    if (initialStages.length === 0) return undefined;
    const counts: Record<string, number> = {};
    for (const s of initialStages) {
      counts[s.type] = (counts[s.type] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ");
  })();

  // Extract coverage gaps for enriched profile prompt
  const coverageGaps = coverageAnalysis?.gaps
    ?.filter((g) => g.severity === "critical" || g.severity === "important")
    .map((g) => g.requirement) ?? undefined;

  return (
    <div className="flex gap-6">
      {/* Left nav */}
      <nav className="w-48 shrink-0 pt-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 mb-1">Setup</p>
        <div className="space-y-0.5">
          {setupItems.map((item) => {
            const active = activeItem === item.id;
            const hasData =
              item.id === "profile"
                ? candidateProfile !== null
                : initialStages.length > 0;
            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-all",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <item.Icon size={16} weight="duotone" className="shrink-0" />
                <span className="flex-1">{item.name}</span>
                {hasData && (
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="my-3 border-t border-border/40" />

        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 mb-1">Collaborate</p>
        <div className="space-y-0.5">
          {collaborateItems.map((item) => {
            const active = activeItem === item.id;
            const hasData =
              item.id === "collaborators"
                ? collaborators.length > 0
                : shareLinks.length > 0;
            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-all",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <item.Icon size={16} weight="duotone" className="shrink-0" />
                <span className="flex-1">{item.name}</span>
                {hasData && (
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

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
        {/* Readiness checklist */}
        <div className={cn(
          "mb-4 rounded-xl border px-5 py-4",
          allDone
            ? "border-green-200 bg-green-50/50"
            : "border-border/40 bg-card",
        )}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-foreground">Interview Readiness</h3>
            {requiredDone && (
              <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[12px] font-medium text-green-700">
                <Rocket size={14} weight="duotone" />
                Ready for interviews
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {readinessItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveItem(item.section)}
                className="flex items-center gap-2 text-left text-[12px] hover:text-teal-700 transition-colors group"
              >
                {item.done ? (
                  <CheckCircle size={15} weight="fill" className="text-green-500 shrink-0" />
                ) : (
                  <Circle size={15} weight="regular" className="text-muted-foreground/40 shrink-0" />
                )}
                <span className={cn(
                  item.done ? "text-muted-foreground" : "text-foreground",
                  "group-hover:text-teal-700",
                )}>
                  {item.label}
                  {!item.required && <span className="text-muted-foreground/50 ml-1">(optional)</span>}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Process warnings */}
        {allWarnings.length > 0 && (
          <div className="mb-4 space-y-2">
            <h4 className="text-[12px] font-semibold text-amber-800">Process Warnings</h4>
            {allWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                <WarningCircle weight="duotone" size={15} className="mt-0.5 shrink-0" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Competitive insights */}
        {competitiveInsights.length > 0 && (
          <div className="mb-4 space-y-2">
            <h4 className="text-[12px] font-semibold text-blue-800">Market Intelligence</h4>
            {competitiveInsights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
                <Lightbulb weight="duotone" size={15} className="mt-0.5 shrink-0" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}

        {/* How to Use guide */}
        <div className="mb-4">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/30 px-3 py-1.5 text-[13px] font-medium text-foreground/70 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
          >
            <Question size={15} weight="bold" className="text-teal-600" />
            {showGuide ? "Hide guide" : "How to use this page"}
          </button>

          {showGuide && (
            <div className="mt-3 rounded-xl border border-border/30 bg-muted/20 px-6 py-5 space-y-4 text-[13px] text-foreground/80 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-start gap-3">
                <Sparkle size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
                <p><span className="font-semibold text-foreground">Candidate Profile</span> — AI generates an ideal candidate profile based on your strategy and market data. Edit any field inline, or ask AI to refine individual sections.</p>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
                <p><span className="font-semibold text-foreground">Process Summary</span> — Read-only overview of your interview stages from the Process chapter.</p>
              </div>
              <div className="flex items-start gap-3">
                <UsersThree size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
                <p><span className="font-semibold text-foreground">Collaborators</span> — Invite interviewers by email. Assign them to specific stages.</p>
              </div>
              <div className="flex items-start gap-3">
                <LinkSimple size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
                <p><span className="font-semibold text-foreground">Share Links</span> — Create secure token links for external stakeholders. They see only stage info and their feedback form.</p>
              </div>
              <p className="text-[12px] text-muted-foreground pt-1 border-t border-border/20">
                <span className="font-medium">Tip:</span> Start by generating a candidate profile, review and edit it, then invite your interview team.
              </p>
            </div>
          )}
        </div>

        {activeItem === "profile" && (
          <CandidateProfileBuilder
            playbookId={playbook.id}
            candidateProfile={candidateProfile}
            hiringStrategy={playbook.hiring_strategy}
            marketInsights={playbook.market_insights}
            role={playbook.title}
            level={playbook.level ?? ""}
            industry={playbook.industry ?? ""}
            skills={playbook.skills}
            stageTypesSummary={stageTypesSummary}
            coverageGaps={coverageGaps}
            isProfileStale={isProfileStale}
            onUpdate={setCandidateProfile}
          />
        )}

        {activeItem === "process" && (
          <ProcessSummary
            stages={initialStages}
            coverageAnalysis={coverageAnalysis}
            collaborators={collaborators}
            playbookId={playbook.id}
          />
        )}

        {activeItem === "collaborators" && (
          <CollaboratorManager
            playbookId={playbook.id}
            playbookTitle={playbook.title}
            collaborators={collaborators}
            stages={initialStages}
            onUpdate={setCollaborators}
          />
        )}

        {activeItem === "share-links" && (
          <ShareableLink
            playbookId={playbook.id}
            shareLinks={shareLinks}
            onUpdate={setShareLinks}
          />
        )}
      </div>
    </div>
  );
}
