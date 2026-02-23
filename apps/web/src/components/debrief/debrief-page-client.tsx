"use client";

import { useState } from "react";
import type { Json } from "@reconnect/database";
import { InterviewList } from "./interview-list";
import { FeedbackList } from "./feedback-list";
import { AISynthesisPanel } from "./ai-synthesis-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
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
  transcript: string | null;
  transcript_metadata: Json | null;
  created_at: string | null;
}

interface DebriefPageClientProps {
  playbookId: string;
  playbookTitle: string;
  stages: StageInfo[];
  candidates: CandidateData[];
  interviews: InterviewData[];
  currentUserId: string;
  currentUserRole: string;
}

const debriefItems = [
  { id: "interviews", name: "Interviews" },
  { id: "feedback", name: "Feedback" },
  { id: "synthesis", name: "AI Synthesis" },
] as const;

export function DebriefPageClient({
  playbookId,
  playbookTitle,
  stages,
  candidates,
  interviews,
  currentUserId,
  currentUserRole,
}: DebriefPageClientProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[0]?.id ?? "",
  );
  const [activeItem, setActiveItem] = useState("interviews");

  const selectedCandidate = candidates.find(
    (c) => c.id === selectedCandidateId,
  );

  const candidateInterviews = interviews.filter(
    (i) => i.candidate_id === selectedCandidateId,
  );

  const isManagerOrAdmin =
    currentUserRole === "admin" || currentUserRole === "manager";

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <p className="text-[14px] text-muted-foreground">
          No candidates added yet. Add candidates to begin the debrief process.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Candidate selector — always visible above nav */}
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
          <nav className="w-44 shrink-0 space-y-0.5 pt-0.5">
            {debriefItems
              .filter((item) =>
                item.id === "synthesis" ? isManagerOrAdmin : true,
              )
              .map((item) => {
                const active = activeItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveItem(item.id)}
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] font-medium transition-all",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    {item.name}
                  </button>
                );
              })}

            {/* AI disclaimer */}
            <div className="mt-6 flex items-start gap-1.5 px-3 pt-4 text-[11px] text-muted-foreground">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
              <span>AI-generated content. Hiring decisions must be made by humans.</span>
            </div>
          </nav>

          {/* Vertical divider */}
          <div className="w-px self-stretch bg-border/60" />

          {/* Content area */}
          <div className="min-w-0 flex-1">
            {activeItem === "interviews" && (
              <InterviewList
                playbookId={playbookId}
                candidateId={selectedCandidateId}
                interviews={candidateInterviews}
                stages={stages}
                currentUserId={currentUserId}
              />
            )}

            {activeItem === "feedback" && (
              <FeedbackList
                candidateId={selectedCandidateId}
                interviews={candidateInterviews}
                stages={stages}
                currentUserId={currentUserId}
                isManagerOrAdmin={isManagerOrAdmin}
              />
            )}

            {activeItem === "synthesis" && isManagerOrAdmin && (
              <AISynthesisPanel
                candidateId={selectedCandidateId}
                candidateName={selectedCandidate.name}
                playbookTitle={playbookTitle}
                interviews={candidateInterviews}
                stages={stages}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
