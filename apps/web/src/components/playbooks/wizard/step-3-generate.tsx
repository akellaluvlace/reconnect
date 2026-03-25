"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaybookStore } from "@/stores/playbook-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  WarningCircle,
  ArrowLeft,
  CircleNotch,
  Sparkle,
} from "@phosphor-icons/react";
import { handleSessionExpired } from "@/lib/fetch-utils";

const levelLabels: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-Level",
  senior: "Senior",
  lead: "Lead",
  executive: "Executive",
};

export function Step3Generate() {
  const { draft, setGeneratedContent, setStep, resetDraft } =
    usePlaybookStore();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (
      !draft.basicInfo.title ||
      !draft.roleDetails.level ||
      !draft.roleDetails.industry ||
      draft.roleDetails.skills.length === 0
    ) {
      setError("Missing required fields. Please go back and complete all steps.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      setStatusMessage("Generating market insights...");

      const insightsResponse = await fetch("/api/ai/market-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: draft.basicInfo.title,
          level: draft.roleDetails.level,
          industry: draft.roleDetails.industry,
          location: draft.roleDetails.location || "Ireland",
          market_focus: "irish",
        }),
      });

      if (handleSessionExpired(insightsResponse)) return;
      if (!insightsResponse.ok) {
        const insightsError = await insightsResponse.json().catch(() => ({}));
        throw new Error(
          insightsError.error ||
            `Market insights failed (${insightsResponse.status})`,
        );
      }

      const insightsData = await insightsResponse.json();

      if (!insightsData.data) {
        throw new Error("AI generation returned empty results. Please try again.");
      }

      setGeneratedContent({
        marketInsights: insightsData.data,
      });

      setStatusMessage("Saving hiring plan...");

      const saveResponse = await fetch("/api/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.basicInfo.title,
          department: draft.basicInfo.department || undefined,
          level: draft.roleDetails.level || undefined,
          industry: draft.roleDetails.industry || undefined,
          skills: draft.roleDetails.skills.length > 0 ? draft.roleDetails.skills : undefined,
          location: draft.roleDetails.location || undefined,
          market_insights: insightsData.data,
        }),
      });

      if (handleSessionExpired(saveResponse)) return;
      if (!saveResponse.ok) {
        const saveError = await saveResponse.json().catch(() => ({}));
        throw new Error(
          saveError.error || `Failed to save hiring plan (${saveResponse.status})`,
        );
      }

      const playbook = await saveResponse.json();

      if (!playbook?.id) {
        throw new Error("Hiring plan was created but returned no ID.");
      }

      // Trigger deep research in background (fire-and-forget with failure flag)
      if (insightsData.cache_key) {
        fetch(`/api/ai/market-insights/${insightsData.cache_key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playbook_id: playbook.id }),
          keepalive: true,
        })
          .then((res) => {
            if (handleSessionExpired(res)) return;
            if (!res.ok) {
              console.error("[deep-research] Trigger returned:", res.status);
            }
          })
          .catch((err) => console.warn("[deep-research] Trigger failed:", err));
      }

      // Navigate first — resetDraft on next page mount, not here.
      // Resetting here causes flash if navigation takes longer than the timeout.
      router.push(`/playbooks/${playbook.id}/discovery`);
      return;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setIsGenerating(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold">Review Your Requirements</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Please review everything below before generating. These inputs drive
          all AI research and cannot be changed after generation.
        </p>
      </div>

      <div className="space-y-4">
        {/* Summary with edit hints */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[14px] font-semibold">{draft.basicInfo.title}</h4>
            <button
              onClick={() => setStep(1)}
              className="text-[12px] font-medium text-teal-600 hover:text-teal-700 hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-muted-foreground/70 w-20 shrink-0">Level</span>
              <span className="font-medium">{levelLabels[draft.roleDetails.level] ?? draft.roleDetails.level}</span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-muted-foreground/70 w-20 shrink-0">Industry</span>
              <span className="font-medium">{draft.roleDetails.industry}</span>
            </div>
            {draft.roleDetails.location && (
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-muted-foreground/70 w-20 shrink-0">Location</span>
                <span className="font-medium">{draft.roleDetails.location}</span>
              </div>
            )}
            {draft.basicInfo.department && (
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-muted-foreground/70 w-20 shrink-0">Department</span>
                <span className="font-medium">{draft.basicInfo.department}</span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-muted-foreground/70">Must-have skills</span>
              <button
                onClick={() => setStep(2)}
                className="text-[12px] font-medium text-teal-600 hover:text-teal-700 hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {draft.roleDetails.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-teal-50 text-teal-700 text-[11px]"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* AI notice */}
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/80 p-4">
          <Sparkle size={16} weight="duotone" className="mt-0.5 shrink-0 text-teal-500" />
          <div className="text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">AI-generated content</span>
            <span className="mx-1">&middot;</span>
            Quick market insights take ~10 seconds. Deep research runs in the
            background and unlocks the full pipeline in Discovery.
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <WarningCircle size={16} weight="duotone" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isGenerating && (
          <div className="flex items-center gap-2.5 rounded-lg bg-teal-50 px-4 py-3">
            <CircleNotch size={16} weight="bold" className="animate-spin text-teal-600" />
            <span className="text-[13px] font-medium text-teal-700">
              {statusMessage}
            </span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(2)}
            disabled={isGenerating}
          >
            <ArrowLeft size={14} className="mr-1.5" />
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Confirm & Generate"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
