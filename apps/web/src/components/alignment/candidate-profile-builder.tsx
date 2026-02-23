"use client";

import { useEffect } from "react";
import type { HiringStrategy, CandidateProfile, MarketInsights } from "@reconnect/database";
import { useAIGenerationStore, IDLE_OP } from "@/stores/ai-generation-store";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CandidateProfileBuilderProps {
  playbookId: string;
  candidateProfile: CandidateProfile | null;
  hiringStrategy: HiringStrategy | null;
  marketInsights: MarketInsights | null;
  role: string;
  level: string;
  industry: string;
  skills: string[] | null;
  onUpdate: (data: CandidateProfile) => void;
}

export function CandidateProfileBuilder({
  playbookId,
  candidateProfile,
  hiringStrategy,
  marketInsights,
  role,
  level,
  industry,
  skills,
  onUpdate,
}: CandidateProfileBuilderProps) {
  const opKey = `candidate-profile-${playbookId}`;
  const { status, result, error } = useAIGenerationStore(
    (s) => s.operations[opKey] ?? IDLE_OP,
  );
  const isGenerating = status === "loading";

  // Apply result when operation completes
  useEffect(() => {
    if (status === "success" && result) {
      onUpdate(result as CandidateProfile);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
    if (status === "error" && error) {
      toast.error(error);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
  }, [status, result, error, onUpdate, opKey]);

  function handleGenerate() {
    useAIGenerationStore.getState().startOperation(opKey, async () => {
      const res = await fetch("/api/ai/generate-candidate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          level,
          industry,
          skills: skills ?? [],
          jd_requirements: hiringStrategy
            ? {
                required: hiringStrategy.skills_priority.must_have,
                preferred: hiringStrategy.skills_priority.nice_to_have,
              }
            : undefined,
          strategy_skills_priority: hiringStrategy?.skills_priority,
          market_key_skills: marketInsights
            ? {
                required: marketInsights.key_skills.required,
                emerging: marketInsights.key_skills.emerging,
              }
            : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate candidate profile");
      }

      const { data } = await res.json();

      // Auto-save to playbook
      const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_profile: data }),
      });

      if (!saveRes.ok) {
        console.error("[candidate-profile] Auto-save failed");
        toast.error("Profile generated but failed to save. Try refreshing the page.");
      }

      return data;
    });
  }

  const canGenerate = hiringStrategy !== null;

  if (!candidateProfile) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <Sparkles className="h-6 w-6 text-muted-foreground/40" />
        {canGenerate ? (
          <>
            <p className="mt-3 text-[14px] text-muted-foreground">
              Generate an AI-powered candidate profile based on your hiring
              strategy and job requirements
            </p>
            <Button className="mt-4" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Profile
            </Button>
          </>
        ) : (
          <p className="mt-3 text-[14px] text-muted-foreground">
            Complete the Discovery chapter first (market research + hiring
            strategy) to generate an AI-powered candidate profile.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          aria-label="Regenerate profile"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Ideal Background */}
      {candidateProfile.ideal_background && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <h3 className="text-[15px] font-semibold tracking-tight mb-3">Ideal Background</h3>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {candidateProfile.ideal_background}
          </p>
        </div>
      )}

      {/* Experience Range */}
      {candidateProfile.experience_range && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <h3 className="text-[15px] font-semibold tracking-tight mb-3">Experience Range</h3>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {candidateProfile.experience_range}
          </p>
        </div>
      )}

      {/* Skills */}
      <div className="space-y-5">
        {candidateProfile.must_have_skills &&
          candidateProfile.must_have_skills.length > 0 && (
            <div>
              <p className="mb-3 text-[13px] font-semibold text-red-700">Must-Have Skills</p>
              <div className="flex flex-wrap gap-2">
                {candidateProfile.must_have_skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-800"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

        {candidateProfile.nice_to_have_skills &&
          candidateProfile.nice_to_have_skills.length > 0 && (
            <div>
              <p className="mb-3 text-[13px] font-semibold text-foreground">Nice-to-Have Skills</p>
              <div className="flex flex-wrap gap-2">
                {candidateProfile.nice_to_have_skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-[13px] font-medium text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Cultural Fit */}
      {candidateProfile.cultural_fit_indicators &&
        candidateProfile.cultural_fit_indicators.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
            <h3 className="text-[15px] font-semibold tracking-tight mb-3">Cultural Fit Indicators</h3>
            <ul className="space-y-2">
              {candidateProfile.cultural_fit_indicators.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}
