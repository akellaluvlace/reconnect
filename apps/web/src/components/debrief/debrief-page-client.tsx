"use client";

import { useState, useMemo, useCallback } from "react";
import type { InterviewData, StageInfo, CollaboratorInfo } from "./types";
import { InterviewList } from "./interview-list";
import { FeedbackList } from "./feedback-list";
import { AISynthesisPanel } from "./ai-synthesis-panel";
import { ActivityTimeline } from "./activity-timeline";
import { CandidateComparison } from "./candidate-comparison";
import { BiasDetection } from "./bias-detection";
import { AddCandidateDialog } from "./add-candidate-dialog";
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
  UserPlus,
  Question,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface CandidateData {
  id: string;
  name: string;
  email: string | null;
  status: string | null;
  current_stage_id: string | null;
  playbook_id: string | null;
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
  collaborators?: CollaboratorInfo[];
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
  collaborators = [],
}: DebriefPageClientProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [candidateList, setCandidateList] = useState(candidates);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[0]?.id ?? "",
  );
  const [activeItem, setActiveItem] = useState<NavItemId>("interviews");

  const handleCandidateAdded = useCallback((candidate: CandidateData) => {
    setCandidateList((prev) => [candidate, ...prev]);
    setSelectedCandidateId(candidate.id);
  }, []);

  const selectedCandidate = candidateList.find(
    (c) => c.id === selectedCandidateId,
  );

  const candidateInterviews = interviews.filter(
    (i) => i.candidate_id === selectedCandidateId,
  );

  const isManagerOrAdmin =
    currentUserRole === "admin" || currentUserRole === "manager";

  const hasMultipleCandidates = candidateList.length >= 2;

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
    () => candidateList.map((c) => ({ id: c.id, name: c.name })),
    [candidateList],
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
    () => candidateList.map((c) => ({ id: c.id, name: c.name, created_at: c.created_at })),
    [candidateList],
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

  if (candidateList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <UserPlus size={24} weight="duotone" className="text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No candidates added yet. Add a candidate to begin the debrief process.
        </p>
        <div className="mt-4">
          <AddCandidateDialog playbookId={playbookId} onAdded={handleCandidateAdded} />
        </div>
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
            candidateName={selectedCandidate?.name}
            candidateEmail={selectedCandidate?.email}
            interviews={candidateInterviews}
            stages={stages}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            collaborators={collaborators}
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
              <CalendarBlank size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
              <p><span className="font-semibold text-foreground">Interviews</span> — Schedule, reschedule, or cancel interviews. View Meet links, recording status, and pipeline logs.</p>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardText size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
              <p><span className="font-semibold text-foreground">Feedback</span> — Submit and view interviewer feedback. Ratings use a 1-4 scale. Managers can see all feedback; interviewers see only their own.</p>
            </div>
            <div className="flex items-start gap-3">
              <Brain size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
              <p><span className="font-semibold text-foreground">AI Synthesis</span> — Generate an AI analysis combining transcript and feedback. Available to managers and admins after feedback is submitted.</p>
            </div>
            <div className="flex items-start gap-3">
              <UsersThree size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
              <p><span className="font-semibold text-foreground">Comparison</span> — Compare candidates side by side. Requires at least 2 candidates.</p>
            </div>
            <div className="flex items-start gap-3">
              <Scales size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
              <p><span className="font-semibold text-foreground">Bias Flags</span> — AI flags potential bias patterns across feedback.</p>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" />
              <p><span className="font-semibold text-foreground">Timeline</span> — Activity timeline showing all events for this playbook.</p>
            </div>
            <p className="text-[12px] text-muted-foreground pt-1 border-t border-border/20">
              <span className="font-medium">Tip:</span> Add a candidate, schedule interviews, collect feedback, then generate AI synthesis for a complete debrief.
            </p>
          </div>
        )}
      </div>

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
            {candidateList.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.status && c.status !== "active" ? ` (${c.status})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AddCandidateDialog playbookId={playbookId} onAdded={handleCandidateAdded} />
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
