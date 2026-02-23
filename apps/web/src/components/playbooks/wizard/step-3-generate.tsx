"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaybookStore } from "@/stores/playbook-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react";

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

      setStatusMessage("Saving playbook...");

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

      if (!saveResponse.ok) {
        const saveError = await saveResponse.json().catch(() => ({}));
        throw new Error(
          saveError.error || `Failed to save playbook (${saveResponse.status})`,
        );
      }

      const playbook = await saveResponse.json();

      if (!playbook?.id) {
        throw new Error("Playbook was created but returned no ID.");
      }

      // Trigger deep research in background
      if (insightsData.cache_key) {
        console.log("[deep-research] Triggering with cache_key:", insightsData.cache_key, "playbook:", playbook.id);
        fetch(`/api/ai/market-insights/${insightsData.cache_key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playbook_id: playbook.id }),
          keepalive: true,
        })
          .then((res) => {
            console.log("[deep-research] Response status:", res.status);
            return res.json().catch(() => ({}));
          })
          .then((data) => console.log("[deep-research] Response:", JSON.stringify(data).slice(0, 200)))
          .catch((err) => console.warn("[deep-research] Trigger failed:", err));
      } else {
        console.warn("[deep-research] No cache_key returned from quick insights — skipping deep research");
      }

      resetDraft();
      router.push(`/playbooks/${playbook.id}/discovery`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setIsGenerating(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold">Generate Content</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          AI will research market data for this role. Strategy and JD are
          generated in Discovery after deep research completes.
        </p>
      </div>

      <div className="space-y-4">
        {/* Summary */}
        <div className="rounded-lg bg-muted/60 p-4 space-y-2">
          <h4 className="text-[14px] font-semibold">{draft.basicInfo.title}</h4>
          <p className="text-[13px] text-muted-foreground">
            {levelLabels[draft.roleDetails.level] ?? draft.roleDetails.level}
            {" \u00B7 "}
            {draft.roleDetails.industry}
            {draft.roleDetails.location &&
              ` \u00B7 ${draft.roleDetails.location}`}
          </p>
          {draft.basicInfo.department && (
            <p className="text-[13px] text-muted-foreground">
              {draft.basicInfo.department}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
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

        {/* AI notice */}
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/80 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
          <div className="text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">AI-generated content</span>
            <span className="mx-1">&middot;</span>
            Quick market insights take ~10 seconds. Deep research runs in the
            background and unlocks the full pipeline in Discovery.
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isGenerating && (
          <div className="flex items-center gap-2.5 rounded-lg bg-teal-50 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
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
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate & Create"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
