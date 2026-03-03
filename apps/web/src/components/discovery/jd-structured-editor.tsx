"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JobDescription, MarketInsights, HiringStrategy } from "@reconnect/database";
import { useAIGenerationStore, IDLE_OP } from "@/stores/ai-generation-store";
import { Button } from "@/components/ui/button";
import { JDSectionCard } from "./jd-section-card";
import { Sparkle, CircleNotch, Info, Copy, Eye, EyeSlash } from "@phosphor-icons/react";
import { useAutoSave } from "@/hooks/use-auto-save";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

const SALARY_LABELS: Record<string, string> = {
  lead: "Lead Market",
  match: "Match Market",
  lag: "Below Market",
};

interface JDStructuredEditorProps {
  playbookId: string;
  jobDescription: JobDescription | null;
  strategy: HiringStrategy | null;
  marketInsights: MarketInsights | null;
  role: string;
  level: string;
  industry: string;
  onUpdate: (jd: JobDescription) => void;
  activeItem: string;
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
  activeItem,
}: JDStructuredEditorProps) {
  const opKey = `jd-${playbookId}`;
  const { status, result, error } = useAIGenerationStore(
    (s) => s.operations[opKey] ?? IDLE_OP,
  );
  const isRegenerating = status === "loading";

  useEffect(() => {
    if (status === "success" && result) {
      onUpdate(result as JobDescription);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
    if (status === "error" && error) {
      toast.error(error);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
  }, [status, result, error, onUpdate, opKey]);

  const saveToServer = useCallback(
    async (data: unknown) => {
      const res = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: data }),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) throw new Error("Failed to save");
    },
    [playbookId],
  );

  const { save } = useAutoSave({ onSave: saveToServer });

  const [hiddenSections, setHiddenSections] = useState<Set<string>>(() => {
    const hidden = (jobDescription as Record<string, unknown> | null)?.hidden_jd_sections;
    return new Set(Array.isArray(hidden) ? (hidden as string[]) : []);
  });

  // Keep a ref to the latest jobDescription so the toggle handler never reads stale data
  const jdRef = useRef(jobDescription);
  jdRef.current = jobDescription;

  // Sync hiddenSections when jobDescription changes externally (e.g. after AI regeneration)
  useEffect(() => {
    const hidden = (jobDescription as Record<string, unknown> | null)?.hidden_jd_sections;
    const arr = Array.isArray(hidden) ? (hidden as string[]) : [];
    setHiddenSections(new Set(arr));
  }, [jobDescription]);

  function handleToggleSection(section: string) {
    // Compute toggled set once to avoid stale closure on hiddenSections
    const nextHidden = new Set(hiddenSections);
    if (nextHidden.has(section)) {
      nextHidden.delete(section);
    } else {
      nextHidden.add(section);
    }

    setHiddenSections(nextHidden);

    const updated = {
      ...jdRef.current,
      hidden_jd_sections: [...nextHidden],
    };
    onUpdate(updated as JobDescription);
    save(updated);
  }

  function handleSectionChange(
    section: keyof JobDescription,
    value: unknown,
  ) {
    const updated = { ...jobDescription, [section]: value } as JobDescription;
    onUpdate(updated);
    save(updated);
  }

  function handleRegenerate() {
    useAIGenerationStore.getState().startOperation(opKey, async () => {
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
        signal: AbortSignal.timeout(60_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("JD generation timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.issues) console.error("[jd-editor] Validation issues:", JSON.stringify(err.issues, null, 2));
        throw new Error(err.error || "Failed to regenerate JD");
      }

      const { data } = await res.json();

      const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: data }),
      });
      if (handleSessionExpired(saveRes)) return;
      if (!saveRes.ok) {
        console.error("[jd-editor] Auto-save after regeneration failed");
        toast.error("JD regenerated but failed to save. Try refreshing the page.");
      }

      return data;
    });
  }

  if (!jobDescription) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <Sparkle size={24} weight="duotone" className="text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No job description yet. Generate one using AI.
        </p>
        <Button className="mt-4" onClick={handleRegenerate} disabled={isRegenerating}>
          {isRegenerating ? (
            <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
          ) : (
            <Sparkle size={16} weight="duotone" className="mr-2" />
          )}
          Generate Job Description
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header — always visible */}
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? (
            <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
          ) : (
            <Sparkle size={16} weight="duotone" className="mr-2" />
          )}
          Regenerate
        </Button>
      </div>

      {activeItem === "full-listing" && (() => {
        const sectionToggles = [
          { key: "summary", label: "Summary" },
          { key: "responsibilities", label: "Responsibilities" },
          { key: "required", label: "Required Qualifications" },
          { key: "preferred", label: "Preferred Qualifications" },
          { key: "benefits", label: "Benefits" },
          { key: "salary_range", label: "Salary Range" },
        ];

        return (
        <div className="space-y-6">
          {/* Toggle panel + Copy */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {sectionToggles.map(({ key, label }) => {
                const isVisible = !hiddenSections.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => handleToggleSection(key)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      isVisible
                        ? "border-teal-200 bg-teal-50/60 text-teal-800 hover:bg-teal-50"
                        : "border-border/40 bg-muted/30 text-muted-foreground line-through hover:bg-muted/50"
                    }`}
                  >
                    {isVisible ? <Eye size={13} weight="duotone" /> : <EyeSlash size={13} weight="duotone" />}
                    {label}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lines: string[] = [];
                lines.push(role);
                if (level) lines.push(`${level} · ${industry}`);
                if (!hiddenSections.has("summary") && jobDescription.summary) {
                  lines.push("", jobDescription.summary);
                }
                if (!hiddenSections.has("responsibilities") && jobDescription.responsibilities?.length) {
                  lines.push("", "Responsibilities:");
                  jobDescription.responsibilities.forEach((r) => lines.push(`- ${r}`));
                }
                if (!hiddenSections.has("required") && jobDescription.requirements?.required?.length) {
                  lines.push("", "Required Qualifications:");
                  jobDescription.requirements.required.forEach((r) => lines.push(`- ${r}`));
                }
                if (!hiddenSections.has("preferred") && jobDescription.requirements?.preferred?.length) {
                  lines.push("", "Preferred Qualifications:");
                  jobDescription.requirements.preferred.forEach((r) => lines.push(`- ${r}`));
                }
                if (!hiddenSections.has("benefits") && jobDescription.benefits?.length) {
                  lines.push("", "Benefits:");
                  jobDescription.benefits.forEach((b) => lines.push(`- ${b}`));
                }
                if (!hiddenSections.has("salary_range")) {
                  const sr = jobDescription.salary_range;
                  if (sr && sr.min && sr.min > 0) {
                    lines.push(
                      "",
                      `Salary Range: ${sr.currency} ${sr.min.toLocaleString()} – ${sr.max.toLocaleString()}`,
                    );
                  }
                }
                navigator.clipboard.writeText(lines.join("\n")).then(
                  () => toast.success("Job description copied to clipboard"),
                  () => toast.error("Failed to copy to clipboard"),
                );
              }}
            >
              <Copy size={14} weight="duotone" className="mr-1.5" />
              Copy
            </Button>
          </div>
          <div className="rounded-xl border border-border/40 bg-card p-8 shadow-sm">
            <h2 className="text-[22px] font-bold tracking-tight text-foreground">
              {role}
            </h2>
            {level && (
              <p className="mt-1 text-[14px] text-muted-foreground">{level} · {industry}</p>
            )}

            {!hiddenSections.has("summary") && jobDescription.summary && (
              <div className="mt-6">
                <p className="text-[14px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {jobDescription.summary}
                </p>
              </div>
            )}

            {!hiddenSections.has("responsibilities") && jobDescription.responsibilities && jobDescription.responsibilities.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground mb-3">Responsibilities</h3>
                <ul className="space-y-2">
                  {jobDescription.responsibilities.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-foreground/80">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!hiddenSections.has("required") && jobDescription.requirements?.required && jobDescription.requirements.required.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground mb-3">Required Qualifications</h3>
                <ul className="space-y-2">
                  {jobDescription.requirements.required.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-foreground/80">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!hiddenSections.has("preferred") && jobDescription.requirements?.preferred && jobDescription.requirements.preferred.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground mb-3">Preferred Qualifications</h3>
                <ul className="space-y-2">
                  {jobDescription.requirements.preferred.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-foreground/80">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!hiddenSections.has("benefits") && jobDescription.benefits && jobDescription.benefits.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground mb-3">Benefits</h3>
                <ul className="space-y-2">
                  {jobDescription.benefits.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-foreground/80">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!hiddenSections.has("salary_range") && jobDescription.salary_range && jobDescription.salary_range.min > 0 && (
              <div className="mt-6">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground mb-2">Salary Range</h3>
                <p className="text-[18px] font-bold tabular-nums tracking-tight">
                  {jobDescription.salary_range.currency} {jobDescription.salary_range.min.toLocaleString()} – {jobDescription.salary_range.max.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {activeItem === "summary" && (
        <JDSectionCard
          title="Summary"
          type="text"
          value={jobDescription.summary}
          onChange={(val) => handleSectionChange("summary", val)}
        />
      )}

      {activeItem === "responsibilities" && (
        <JDSectionCard
          title="Responsibilities"
          type="list"
          value={jobDescription.responsibilities}
          onChange={(val) => handleSectionChange("responsibilities", val)}
        />
      )}

      {activeItem === "required" && (
        <>
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
          {strategy?.skills_priority?.must_have && strategy.skills_priority.must_have.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-4 py-3 text-[12px] text-muted-foreground">
              <Info size={14} weight="duotone" className="mt-0.5 shrink-0" />
              <span>
                Strategy must-haves: <span className="font-semibold text-foreground">{strategy.skills_priority.must_have.join(", ")}</span>
              </span>
            </div>
          )}
        </>
      )}

      {activeItem === "preferred" && (
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
      )}

      {activeItem === "benefits" && (
        <JDSectionCard
          title="Benefits"
          type="list"
          value={jobDescription.benefits}
          onChange={(val) => handleSectionChange("benefits", val)}
        />
      )}

      {activeItem === "salary-range" && (
        <>
          <JDSectionCard
            title="Salary Range"
            type="salary"
            value={jobDescription.salary_range}
            onChange={(val) => handleSectionChange("salary_range", val)}
          />
          {(strategy?.salary_positioning || marketInsights?.salary) && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-4 py-3 text-[12px] text-muted-foreground">
              <Info size={14} weight="duotone" className="mt-0.5 shrink-0" />
              <span>
                {strategy?.salary_positioning && (
                  <>
                    Strategy: <span className="font-semibold text-foreground">
                      {SALARY_LABELS[strategy.salary_positioning.strategy] ?? strategy.salary_positioning.strategy}
                      {" "}({strategy.salary_positioning.recommended_range.currency} {strategy.salary_positioning.recommended_range.min.toLocaleString()}–{strategy.salary_positioning.recommended_range.max.toLocaleString()})
                    </span>
                  </>
                )}
                {strategy?.salary_positioning && marketInsights?.salary && (
                  <span className="mx-1.5 text-muted-foreground/40">|</span>
                )}
                {marketInsights?.salary && (
                  <>
                    Market: <span className="font-semibold text-foreground">
                      {marketInsights.salary.currency} {marketInsights.salary.min.toLocaleString()}–{marketInsights.salary.max.toLocaleString()}
                    </span>
                  </>
                )}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
