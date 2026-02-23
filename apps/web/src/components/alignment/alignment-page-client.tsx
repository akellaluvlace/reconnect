"use client";

import { useState } from "react";
import type { HiringStrategy, CandidateProfile, MarketInsights } from "@reconnect/database";
import { CandidateProfileBuilder } from "./candidate-profile-builder";
import { ProcessSummary } from "./process-summary";
import { CollaboratorManager } from "./collaborator-manager";
import { ShareableLink } from "./shareable-link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
    market_insights: MarketInsights | null;
  };
  initialStages: StageInfo[];
  initialCollaborators: CollaboratorData[];
  initialShareLinks: ShareLinkData[];
}

const alignmentItems = [
  { id: "profile", name: "Candidate Profile" },
  { id: "process", name: "Process Summary" },
  { id: "collaborators", name: "Collaborators" },
  { id: "share-links", name: "Share Links" },
] as const;

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
  const [activeItem, setActiveItem] = useState("profile");

  return (
    <div className="flex gap-6">
      {/* Left nav */}
      <nav className="w-44 shrink-0 space-y-0.5 pt-0.5">
        {alignmentItems.map((item) => {
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
            onUpdate={setCandidateProfile}
          />
        )}

        {activeItem === "process" && (
          <ProcessSummary stages={initialStages} />
        )}

        {activeItem === "collaborators" && (
          <CollaboratorManager
            playbookId={playbook.id}
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
