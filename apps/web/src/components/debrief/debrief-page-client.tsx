"use client";

import { useState, useMemo } from "react";
import type { Json } from "@reconnect/database";
import { InterviewList } from "./interview-list";
import { FeedbackList } from "./feedback-list";
import { AISynthesisPanel } from "./ai-synthesis-panel";
import { ActivityTimeline } from "./activity-timeline";
import { CandidateComparison } from "./candidate-comparison";
import { BiasDetection } from "./bias-detection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkle,
  CalendarBlank,
  ClipboardText,
  Brain,
  UsersThree,
  Scales,
  Clock,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface StageInfo {
  id: string;
  name: string;
  type: string | null;
  order_index: number;
}

interface CandidateData {
  id: string;
  name: string;
  email: string | null;
  status: string | null;
  current_stage_id: string | null;
  playbook_id: string | null;
  created_at: string | null;
}

interface InterviewData {
  id: string;
  candidate_id: string | null;
  stage_id: string | null;
  interviewer_id: string | null;
  status: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  meet_link: string | null;
  recording_status: string | null;
  recording_consent_at: string | null;
  recording_url: string | null;
  drive_file_id: string | null;
  meet_conference_id: string | null;
  transcript_metadata: Json | null;
  created_at: string | null;
}

interface DebriefPageClientProps {
  playbookId: string;
  playbookTitle: string;
  playbookCreatedAt: string | null;
  playbookStatus: string | null;
  playbookUpdatedAt: string | null;
  stages: StageInfo[];
  candidates: CandidateData[];
  interviews: InterviewData[];
  currentUserId: string;
  currentUserRole: string;
}

type NavItemId = "interviews" | "feedback" | "synthesis" | "comparison" | "bias" | "timeline";

interface NavItemDef {
  id: NavItemId;
  name: string;
  Icon: typeof CalendarBlank;
  /** Whether to show a progress dot, and if so, whether it's filled */
  hasDot?: boolean;
  dotFilled?: boolean;
}

export function DebriefPageClient({
  playbookId,
  playbookTitle,
  playbookCreatedAt,
  playbookStatus,
  playbookUpdatedAt,
  stages,
  candidates,
  interviews,
  currentUserId,
  currentUserRole,
}: DebriefPageClientProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[0]?.id ?? "",
  );
  const [activeItem, setActiveItem] = useState<NavItemId>("interviews");

  const selectedCandidate = candidates.find(
    (c) => c.id === selectedCandidateId,
  );

  const candidateInterviews = interviews.filter(
    (i) => i.candidate_id === selectedCandidateId,
  );

  const isManagerOrAdmin =
    currentUserRole === "admin" || currentUserRole === "manager";

  const hasMultipleCandidates = candidates.length >= 2;

  // Memoize mapped props to avoid unstable refs triggering child useEffect re-runs
  const comparisonInterviews = useMemo(
    () => interviews.map((i) => ({
      id: i.id,
      candidate_id: i.candidate_id,
      stage_id: i.stage_id,
      status: i.status,
    })),
    [interviews],
  );

  const comparisonCandidates = useMemo(
    () => candidates.map((c) => ({ id: c.id, name: c.name })),
    [candidates],
  );

  const comparisonStages = useMemo(
    () => stages.map((s) => ({ id: s.id, name: s.name, order_index: s.order_index })),
    [stages],
  );

  const biasStages = useMemo(
    () => stages.map((s) => ({ id: s.id, name: s.name })),
    [stages],
  );

  const timelineCandidates = useMemo(
    () => candidates.map((c) => ({ id: c.id, name: c.name, created_at: c.created_at })),
    [candidates],
  );

  const timelineInterviews = useMemo(
    () => interviews.map((i) => ({
      id: i.id,
      status: i.status,
      scheduled_at: i.scheduled_at,
      completed_at: i.completed_at,
      stage_id: i.stage_id,
    })),
    [interviews],
  );

  // Build nav sections
  const reviewItems: NavItemDef[] = [
    {
      id: "interviews",
      name: "Interviews",
      Icon: CalendarBlank,
      hasDot: true,
      dotFilled: interviews.length > 0,
    },
    {
      id: "feedback",
      name: "Feedback",
      Icon: ClipboardText,
      hasDot: false,
    },
    ...(isManagerOrAdmin
      ? [
          {
            id: "synthesis" as const,
            name: "AI Synthesis",
            Icon: Brain,
            hasDot: false,
          },
        ]
      : []),
  ];

  const insightItems: NavItemDef[] = [
    {
      id: "comparison",
      name: "Comparison",
      Icon: UsersThree,
      hasDot: false,
    },
    {
      id: "bias",
      name: "Bias Flags",
      Icon: Scales,
      hasDot: false,
    },
    {
      id: "timeline",
      name: "Timeline",
      Icon: Clock,
      hasDot: true,
      dotFilled: true, // always has data (playbook exists)
    },
  ];

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <p className="text-[14px] text-muted-foreground">
          No candidates added yet. Add candidates to begin the debrief process.
        </p>
      </div>
    );
  }

  function renderNavSection(label: string, items: NavItemDef[]) {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 mb-1">
          {label}
        </p>
        <div className="space-y-0.5">
          {items.map((item) => {
            const active = activeItem === item.id;
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
                {item.hasDot && (
                  item.dotFilled ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full border border-muted-foreground/30 shrink-0" />
                  )
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  function renderContent() {
    switch (activeItem) {
      case "interviews":
        return (
          <InterviewList
            playbookId={playbookId}
            candidateId={selectedCandidateId}
            interviews={candidateInterviews}
            stages={stages}
            currentUserId={currentUserId}
          />
        );

      case "feedback":
        return (
          <FeedbackList
            candidateId={selectedCandidateId}
            interviews={candidateInterviews}
            stages={stages}
            currentUserId={currentUserId}
            isManagerOrAdmin={isManagerOrAdmin}
          />
        );

      case "synthesis":
        if (!isManagerOrAdmin) return null;
        return (
          <AISynthesisPanel
            candidateId={selectedCandidateId}
            candidateName={selectedCandidate?.name ?? ""}
            playbookTitle={playbookTitle}
            interviews={candidateInterviews}
            stages={stages}
          />
        );

      case "comparison":
        if (!hasMultipleCandidates) {
          return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
              <UsersThree size={24} weight="duotone" className="text-muted-foreground/40" />
              <p className="mt-3 text-[14px] text-muted-foreground">
                Add at least 2 candidates to compare feedback side by side.
              </p>
            </div>
          );
        }
        return (
          <CandidateComparison
            candidates={comparisonCandidates}
            interviews={comparisonInterviews}
            stages={comparisonStages}
          />
        );

      case "bias":
        return (
          <BiasDetection
            candidates={comparisonCandidates}
            interviews={comparisonInterviews}
            stages={biasStages}
          />
        );

      case "timeline":
        return (
          <ActivityTimeline
            playbookCreatedAt={playbookCreatedAt}
            playbookStatus={playbookStatus}
            playbookUpdatedAt={playbookUpdatedAt}
            candidates={timelineCandidates}
            interviews={timelineInterviews}
            stages={biasStages}
          />
        );

      default:
        return null;
    }
  }

  return (
    <div>
      {/* Candidate selector -- always visible above nav */}
      <div className="mb-5 flex items-center gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">
          Candidate
        </span>
        <Select
          value={selectedCandidateId}
          onValueChange={setSelectedCandidateId}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a candidate" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.status && c.status !== "active" ? ` (${c.status})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCandidate && (
        <div className="flex gap-6">
          {/* Left nav */}
          <nav className="w-48 shrink-0 pt-0.5">
            {renderNavSection("Review", reviewItems)}

            <div className="my-3 border-t border-border/40" />

            {renderNavSection("Insights", insightItems)}

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
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
}
