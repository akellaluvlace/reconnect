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
import { Label } from "@/components/ui/label";

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

  const selectedCandidate = candidates.find(
    (c) => c.id === selectedCandidateId,
  );

  const candidateInterviews = interviews.filter(
    (i) => i.candidate_id === selectedCandidateId,
  );

  const isManagerOrAdmin =
    currentUserRole === "admin" || currentUserRole === "manager";

  return (
    <div className="space-y-6">
      {/* Candidate selector */}
      {candidates.length > 0 ? (
        <div className="flex items-center gap-3">
          <Label htmlFor="candidate-select" className="text-sm font-medium">
            Candidate
          </Label>
          <Select
            value={selectedCandidateId}
            onValueChange={setSelectedCandidateId}
          >
            <SelectTrigger id="candidate-select" className="w-64">
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
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No candidates added yet. Add candidates to begin the debrief
            process.
          </p>
        </div>
      )}

      {selectedCandidate && (
        <>
          <InterviewList
            playbookId={playbookId}
            candidateId={selectedCandidateId}
            interviews={candidateInterviews}
            stages={stages}
            currentUserId={currentUserId}
          />

          <FeedbackList
            candidateId={selectedCandidateId}
            interviews={candidateInterviews}
            stages={stages}
            currentUserId={currentUserId}
            isManagerOrAdmin={isManagerOrAdmin}
          />

          {isManagerOrAdmin && (
            <AISynthesisPanel
              candidateId={selectedCandidateId}
              candidateName={selectedCandidate.name}
              playbookTitle={playbookTitle}
              interviews={candidateInterviews}
              stages={stages}
            />
          )}
        </>
      )}
    </div>
  );
}
