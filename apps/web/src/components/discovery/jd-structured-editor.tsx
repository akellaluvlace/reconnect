"use client";

import { useCallback } from "react";
import type { JobDescription, MarketInsights, HiringStrategy } from "@reconnect/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import { JDSectionCard } from "./jd-section-card";
import { FileText, Sparkles, Loader2 } from "lucide-react";
import { useAutoSave } from "@/hooks/use-auto-save";
import { toast } from "sonner";
import { useState } from "react";

interface JDStructuredEditorProps {
  playbookId: string;
  jobDescription: JobDescription | null;
  strategy: HiringStrategy | null;
  marketInsights: MarketInsights | null;
  role: string;
  level: string;
  industry: string;
  onUpdate: (jd: JobDescription) => void;
}

export function JDStructuredEditor({
  playbookId,
  jobDescription,
  strategy,
  marketInsights,
  role,
  level,
  industry,
  onUpdate,
}: JDStructuredEditorProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const saveToServer = useCallback(
    async (data: unknown) => {
      const res = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: data }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    [playbookId],
  );

  const { save } = useAutoSave({ onSave: saveToServer });

  function handleSectionChange(
    section: keyof JobDescription,
    value: unknown,
  ) {
    const updated = { ...jobDescription, [section]: value } as JobDescription;
    onUpdate(updated);
    save(updated);
  }

  async function handleRegenerate() {
    setIsRegenerating(true);
    try {
      const body: Record<string, unknown> = {
        role,
        level,
        industry,
        style: "formal",
      };

      if (marketInsights) {
        body.market_context = {
          salary_range: marketInsights.salary
            ? {
                min: marketInsights.salary.min,
                max: marketInsights.salary.max,
                currency: marketInsights.salary.currency,
              }
            : undefined,
          key_skills: marketInsights.key_skills?.required?.slice(0, 5),
          demand_level: marketInsights.candidate_availability?.level,
          competitors: marketInsights.competition?.companies_hiring?.slice(0, 5),
        };
      }

      if (strategy) {
        body.strategy_context = {
          salary_positioning: {
            strategy: strategy.salary_positioning.strategy,
            recommended_range: strategy.salary_positioning.recommended_range,
          },
          competitive_differentiators: strategy.competitive_differentiators.slice(0, 3),
          skills_priority: {
            must_have: strategy.skills_priority.must_have.slice(0, 5),
            nice_to_have: strategy.skills_priority.nice_to_have.slice(0, 3),
          },
        };
      }

      const res = await fetch("/api/ai/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to regenerate JD");
      }

      const { data } = await res.json();
      onUpdate(data);

      // Auto-save
      const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: data }),
      });
      if (!saveRes.ok) {
        console.error("[jd-editor] Auto-save after regeneration failed");
        toast.error("Generated new JD but failed to save — please try saving again");
      }
    } catch (err) {
      console.error("[jd-editor] Regeneration failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to regenerate job description",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  if (!jobDescription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Job Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              No job description yet. Generate one using AI.
            </p>
            <Button onClick={handleRegenerate} disabled={isRegenerating}>
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Job Description
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
            <FileText className="h-5 w-5" />
            Job Description
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <JDSectionCard
          title="Summary"
          type="text"
          value={jobDescription.summary}
          onChange={(val) => handleSectionChange("summary", val)}
        />

        <JDSectionCard
          title="Responsibilities"
          type="list"
          value={jobDescription.responsibilities}
          onChange={(val) => handleSectionChange("responsibilities", val)}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <JDSectionCard
            title="Required Qualifications"
            type="list"
            value={jobDescription.requirements?.required}
            onChange={(val) =>
              handleSectionChange("requirements", {
                ...jobDescription.requirements,
                required: val,
              })
            }
          />
          <JDSectionCard
            title="Preferred Qualifications"
            type="list"
            value={jobDescription.requirements?.preferred}
            onChange={(val) =>
              handleSectionChange("requirements", {
                ...jobDescription.requirements,
                preferred: val,
              })
            }
          />
        </div>

        <JDSectionCard
          title="Benefits"
          type="list"
          value={jobDescription.benefits}
          onChange={(val) => handleSectionChange("benefits", val)}
        />

        <JDSectionCard
          title="Salary Range"
          type="salary"
          value={jobDescription.salary_range}
          onChange={(val) => handleSectionChange("salary_range", val)}
        />

        <AIDisclaimer />
      </CardContent>
    </Card>
  );
}
