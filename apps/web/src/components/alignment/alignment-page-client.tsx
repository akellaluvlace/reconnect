"use client";

import { useState } from "react";
import type { HiringStrategy, CandidateProfile } from "@reconnect/database";
import { CandidateProfileBuilder } from "./candidate-profile-builder";
import { ProcessSummary } from "./process-summary";
import { CollaboratorManager } from "./collaborator-manager";
import { ShareableLink } from "./shareable-link";

interface StageInfo {
  id: string;
  name: string;
  type: string;
  duration_minutes: number;
  order_index: number;
}

interface CollaboratorData {
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

interface ShareLinkData {
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
  };
  initialStages: StageInfo[];
  initialCollaborators: CollaboratorData[];
  initialShareLinks: ShareLinkData[];
}

export function AlignmentPageClient({
  playbook,
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

  return (
    <div className="space-y-6">
      <CandidateProfileBuilder
        playbookId={playbook.id}
        candidateProfile={candidateProfile}
        hiringStrategy={playbook.hiring_strategy}
        role={playbook.title}
        level={playbook.level ?? ""}
        industry={playbook.industry ?? ""}
        skills={playbook.skills}
        onUpdate={setCandidateProfile}
      />

      <ProcessSummary stages={initialStages} />

      <CollaboratorManager
        playbookId={playbook.id}
        collaborators={collaborators}
        stages={initialStages}
        onUpdate={setCollaborators}
      />

      <ShareableLink
        playbookId={playbook.id}
        shareLinks={shareLinks}
        onUpdate={setShareLinks}
      />
    </div>
  );
}
