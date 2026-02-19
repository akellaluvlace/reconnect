"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaybookStore } from "@/stores/playbook-store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

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
      setStatusMessage("Generating market insights and job description...");

      const [jdResponse, insightsResponse] = await Promise.all([
        fetch("/api/ai/generate-jd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: draft.basicInfo.title,
            level: draft.roleDetails.level,
            industry: draft.roleDetails.industry,
            style: "formal",
            currency: "EUR",
          }),
        }),
        fetch("/api/ai/market-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: draft.basicInfo.title,
            level: draft.roleDetails.level,
            industry: draft.roleDetails.industry,
            location: draft.roleDetails.location || "Ireland",
            market_focus: "irish",
          }),
        }),
      ]);

      if (!jdResponse.ok) {
        const jdError = await jdResponse.json().catch(() => ({}));
        throw new Error(
          jdError.error || `JD generation failed (${jdResponse.status})`,
        );
      }

      if (!insightsResponse.ok) {
        const insightsError = await insightsResponse.json().catch(() => ({}));
        throw new Error(
          insightsError.error ||
            `Market insights failed (${insightsResponse.status})`,
        );
      }

      const jdData = await jdResponse.json();
      const insightsData = await insightsResponse.json();

      if (!jdData.data || !insightsData.data) {
        throw new Error("AI generation returned empty results. Please try again.");
      }

      setGeneratedContent({
        jobDescription: jdData.data,
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
          job_description: jdData.data,
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

      // Trigger deep research in background (fire-and-forget)
      if (insightsData.cache_key) {
        fetch(`/api/ai/market-insights/${insightsData.cache_key}`, {
          method: "POST",
        }).catch((err) =>
          console.warn("[deep-research] Trigger failed:", err),
        );
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
    <Card>
      <CardHeader>
        <CardTitle>Generate Content</CardTitle>
        <CardDescription>
          AI will generate market insights and a job description based on your
          inputs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-medium">{draft.basicInfo.title}</h4>
          <p className="text-sm text-muted-foreground">
            {levelLabels[draft.roleDetails.level] ?? draft.roleDetails.level}
            {" \u00B7 "}
            {draft.roleDetails.industry}
            {draft.roleDetails.location &&
              ` \u00B7 ${draft.roleDetails.location}`}
          </p>
          {draft.basicInfo.department && (
            <p className="text-sm text-muted-foreground">
              {draft.basicInfo.department}
            </p>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {draft.roleDetails.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium text-foreground">
              AI-generated content
            </span>
          </div>
          <p>
            This will generate a job description and market insights using AI.
            Content can be reviewed and edited after creation.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isGenerating && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {statusMessage}
            </div>
            <Progress className="h-2" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep(2)}
          disabled={isGenerating}
        >
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
      </CardFooter>
    </Card>
  );
}
