"use client";

import { useState } from "react";
import type { HiringStrategy, CandidateProfile } from "@reconnect/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import { AIIndicatorBadge } from "@/components/ai/ai-indicator-badge";
import { User, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CandidateProfileBuilderProps {
  playbookId: string;
  candidateProfile: CandidateProfile | null;
  hiringStrategy: HiringStrategy | null;
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
  role,
  level,
  industry,
  skills,
  onUpdate,
}: CandidateProfileBuilderProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
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
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate candidate profile");
      }

      const { data } = await res.json();
      onUpdate(data);

      // Auto-save to playbook
      const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_profile: data }),
      });

      if (!saveRes.ok) {
        console.error("[candidate-profile] Auto-save failed");
        toast.error("Profile generated but failed to save");
      }
    } catch (err) {
      console.error("[candidate-profile] Generation failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate profile",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (!candidateProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Ideal Candidate Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Generate an AI-powered candidate profile based on your hiring
              strategy and job requirements
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Ideal Candidate Profile
          </CardTitle>
          <div className="flex items-center gap-2">
            <AIIndicatorBadge />
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {candidateProfile.ideal_background && (
          <div>
            <p className="text-sm font-medium">Ideal Background</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {candidateProfile.ideal_background}
            </p>
          </div>
        )}

        {candidateProfile.experience_range && (
          <div>
            <p className="text-sm font-medium">Experience Range</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {candidateProfile.experience_range}
            </p>
          </div>
        )}

        {candidateProfile.must_have_skills &&
          candidateProfile.must_have_skills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-700">
                Must-Have Skills
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {candidateProfile.must_have_skills.map((s) => (
                  <Badge
                    key={s}
                    className="bg-red-100 text-red-800 hover:bg-red-100 text-xs"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        {candidateProfile.nice_to_have_skills &&
          candidateProfile.nice_to_have_skills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-blue-700">
                Nice-to-Have Skills
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {candidateProfile.nice_to_have_skills.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        {candidateProfile.cultural_fit_indicators &&
          candidateProfile.cultural_fit_indicators.length > 0 && (
            <div>
              <p className="text-sm font-medium">Cultural Fit Indicators</p>
              <ul className="mt-1 space-y-1">
                {candidateProfile.cultural_fit_indicators.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

        <AIDisclaimer />
      </CardContent>
    </Card>
  );
}
