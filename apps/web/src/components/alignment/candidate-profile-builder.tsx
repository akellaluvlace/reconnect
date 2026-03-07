"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { HiringStrategy, CandidateProfile, MarketInsights } from "@reconnect/database";
import { useAIGenerationStore, IDLE_OP } from "@/stores/ai-generation-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkle,
  CircleNotch,
  Warning,
  PencilSimple,
  X,
  Check,
  Plus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import { cn } from "@/lib/utils";

type EditableSection =
  | "ideal_background"
  | "experience_range"
  | "must_have_skills"
  | "nice_to_have_skills"
  | "cultural_fit_indicators"
  | null;

interface CandidateProfileBuilderProps {
  playbookId: string;
  candidateProfile: CandidateProfile | null;
  hiringStrategy: HiringStrategy | null;
  marketInsights: MarketInsights | null;
  role: string;
  level: string;
  industry: string;
  skills: string[] | null;
  stageTypesSummary?: string;
  coverageGaps?: string[];
  isProfileStale: boolean;
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
  stageTypesSummary,
  coverageGaps,
  isProfileStale,
  onUpdate,
}: CandidateProfileBuilderProps) {
  const opKey = `candidate-profile-${playbookId}`;
  const { status, result, error } = useAIGenerationStore(
    (s) => s.operations[opKey] ?? IDLE_OP,
  );
  const isGenerating = status === "loading";

  // Editing state
  const [editingField, setEditingField] = useState<EditableSection>(null);
  const [editValue, setEditValue] = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editIndicators, setEditIndicators] = useState<string[]>([]);
  const [newItemInput, setNewItemInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Refine state
  const [refiningSection, setRefiningSection] = useState<EditableSection>(null);
  const [refineGuidance, setRefineGuidance] = useState("");
  const [refineAlternatives, setRefineAlternatives] = useState<
    Array<{ value: string | string[]; rationale: string }>
  >([]);
  const [isRefining, setIsRefining] = useState(false);

  // Regenerate confirmation
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // Debounced save ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Save profile to server
  const saveProfile = useCallback(
    async (updated: CandidateProfile) => {
      setIsSaving(true);
      try {
        const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidate_profile: updated }),
        });
        if (handleSessionExpired(saveRes)) return;
        if (!saveRes.ok) {
          toast.error("Failed to save changes");
        }
      } catch {
        toast.error("Failed to save changes");
      } finally {
        setIsSaving(false);
      }
    },
    [playbookId],
  );

  // Debounced save (for skill/indicator array changes)
  const debouncedSave = useCallback(
    (updated: CandidateProfile) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveProfile(updated), 2000);
    },
    [saveProfile],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

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
          emerging_premium: hiringStrategy?.skills_priority.emerging_premium,
          market_key_skills: marketInsights
            ? {
                required: marketInsights.key_skills.required,
                emerging: marketInsights.key_skills.emerging,
              }
            : undefined,
          stage_types_summary: stageTypesSummary,
          coverage_gaps: coverageGaps?.length ? coverageGaps : undefined,
        }),
        signal: AbortSignal.timeout(120_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("Profile generation timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate candidate profile");
      }

      const { data } = await res.json();
      const profileWithTimestamp = { ...data, generated_at: new Date().toISOString() };

      const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_profile: profileWithTimestamp }),
      });

      if (handleSessionExpired(saveRes)) return;
      if (!saveRes.ok) {
        console.error("[candidate-profile] Auto-save failed");
        toast.error("Profile generated but failed to save. Try refreshing the page.");
      }

      return profileWithTimestamp;
    });
  }

  function handleRegenerate() {
    setShowRegenConfirm(false);
    handleGenerate();
  }

  // --- Inline editing helpers ---

  function startEdit(section: EditableSection) {
    if (!candidateProfile || !section) return;
    setEditingField(section);
    setRefiningSection(null);
    setRefineAlternatives([]);
    if (section === "ideal_background") {
      setEditValue(candidateProfile.ideal_background ?? "");
    } else if (section === "experience_range") {
      setEditValue(candidateProfile.experience_range ?? "");
    } else if (section === "must_have_skills") {
      setEditSkills([...(candidateProfile.must_have_skills ?? [])]);
    } else if (section === "nice_to_have_skills") {
      setEditSkills([...(candidateProfile.nice_to_have_skills ?? [])]);
    } else if (section === "cultural_fit_indicators") {
      setEditIndicators([...(candidateProfile.cultural_fit_indicators ?? [])]);
    }
    setNewItemInput("");
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue("");
    setEditSkills([]);
    setEditIndicators([]);
    setNewItemInput("");
  }

  function saveEdit() {
    if (!candidateProfile || !editingField) return;
    let updated: CandidateProfile;
    if (editingField === "ideal_background" || editingField === "experience_range") {
      updated = { ...candidateProfile, [editingField]: editValue.trim() };
    } else if (editingField === "must_have_skills" || editingField === "nice_to_have_skills") {
      updated = { ...candidateProfile, [editingField]: editSkills };
    } else {
      updated = { ...candidateProfile, cultural_fit_indicators: editIndicators };
    }
    onUpdate(updated);
    saveProfile(updated);
    cancelEdit();
  }

  // Skill tag helpers
  function addSkill() {
    const trimmed = newItemInput.trim();
    if (!trimmed || editSkills.includes(trimmed)) return;
    setEditSkills([...editSkills, trimmed]);
    setNewItemInput("");
  }

  function removeSkill(index: number) {
    setEditSkills(editSkills.filter((_, i) => i !== index));
  }

  // Indicator list helpers
  function addIndicator() {
    const trimmed = newItemInput.trim();
    if (!trimmed) return;
    setEditIndicators([...editIndicators, trimmed]);
    setNewItemInput("");
  }

  function removeIndicator(index: number) {
    setEditIndicators(editIndicators.filter((_, i) => i !== index));
  }

  function updateIndicator(index: number, value: string) {
    setEditIndicators(editIndicators.map((item, i) => (i === index ? value : item)));
  }

  // --- AI Refine ---

  async function handleRefine(section: EditableSection) {
    if (!candidateProfile || !section) return;
    setRefiningSection(section);
    setEditingField(null);
    setRefineAlternatives([]);
    setRefineGuidance("");
  }

  async function submitRefine() {
    if (!candidateProfile || !refiningSection) return;
    setIsRefining(true);
    setRefineAlternatives([]);

    let currentValue: string | string[];
    if (refiningSection === "ideal_background") {
      currentValue = candidateProfile.ideal_background ?? "";
    } else if (refiningSection === "experience_range") {
      currentValue = candidateProfile.experience_range ?? "";
    } else if (refiningSection === "must_have_skills") {
      currentValue = candidateProfile.must_have_skills ?? [];
    } else if (refiningSection === "nice_to_have_skills") {
      currentValue = candidateProfile.nice_to_have_skills ?? [];
    } else {
      currentValue = candidateProfile.cultural_fit_indicators ?? [];
    }

    try {
      const res = await fetch("/api/ai/refine-profile-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: refiningSection,
          current_value: currentValue,
          guidance: refineGuidance || undefined,
          context: {
            role,
            level,
            industry,
            hiring_strategy_summary: hiringStrategy
              ? `Market: ${hiringStrategy.market_classification}. Must-have: ${hiringStrategy.skills_priority.must_have.slice(0, 5).join(", ")}`
              : undefined,
          },
        }),
        signal: AbortSignal.timeout(60_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("Refine timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to refine section");
      }

      const { data } = await res.json();
      setRefineAlternatives(data.alternatives ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refine");
    } finally {
      setIsRefining(false);
    }
  }

  function applyAlternative(alt: { value: string | string[]; rationale: string }) {
    if (!candidateProfile || !refiningSection) return;
    const updated = { ...candidateProfile, [refiningSection]: alt.value };
    onUpdate(updated);
    saveProfile(updated);
    setRefiningSection(null);
    setRefineAlternatives([]);
  }

  function cancelRefine() {
    setRefiningSection(null);
    setRefineAlternatives([]);
    setRefineGuidance("");
  }

  // --- Section header with edit/refine buttons (plain function, NOT a component) ---
  function renderSectionHeader(title: string, section: EditableSection) {
    return (
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => startEdit(section)}
            disabled={isGenerating}
            className="rounded-lg p-2 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            aria-label={`Edit ${title}`}
            title="Edit manually"
          >
            <PencilSimple size={16} />
          </button>
          <button
            onClick={() => handleRefine(section)}
            disabled={isGenerating}
            className="rounded-lg p-2 text-muted-foreground/60 hover:text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-30"
            aria-label={`AI refine ${title}`}
            title="AI refine"
          >
            <Sparkle size={16} weight="duotone" />
          </button>
        </div>
      </div>
    );
  }

  // --- Refine panel (plain function, NOT a component) ---
  function renderRefinePanel(section: EditableSection) {
    if (refiningSection !== section) return null;
    return (
      <div className="mt-3 rounded-xl border border-teal-200 bg-gradient-to-b from-teal-50/60 to-teal-50/20 p-5 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkle size={16} weight="duotone" className="text-teal-600" />
          <span className="text-[13px] font-semibold text-teal-800">AI Refine</span>
        </div>

        {refineAlternatives.length === 0 && (
          <>
            <Input
              value={refineGuidance}
              onChange={(e) => setRefineGuidance(e.target.value)}
              placeholder="Optional: How should AI improve this? (e.g. 'more senior focus')"
              className="mb-3 text-[13px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelRefine}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitRefine} disabled={isRefining}>
                {isRefining ? (
                  <CircleNotch size={14} weight="bold" className="mr-1.5 animate-spin" />
                ) : (
                  <Sparkle size={14} weight="duotone" className="mr-1.5" />
                )}
                Generate alternatives
              </Button>
            </div>
          </>
        )}

        {refineAlternatives.length > 0 && (
          <div className="space-y-3">
            {refineAlternatives.map((alt, i) => (
              <div
                key={i}
                className="rounded-lg border border-teal-100 bg-white p-4 cursor-pointer hover:border-teal-300 transition-colors"
                onClick={() => applyAlternative(alt)}
              >
                <div className="text-[13px] text-foreground mb-1">
                  {Array.isArray(alt.value) ? alt.value.join(", ") : alt.value}
                </div>
                <div className="text-[12px] text-muted-foreground">{alt.rationale}</div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={cancelRefine}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const canGenerate = hiringStrategy !== null;
  const anyBusy = isGenerating || isSaving || isRefining;

  if (!candidateProfile) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <Sparkle size={24} weight="duotone" className="text-muted-foreground/40" />
        {canGenerate ? (
          <>
            <p className="mt-3 text-[14px] text-muted-foreground">
              Generate an AI-powered candidate profile based on your hiring
              strategy and job requirements
            </p>
            <Button className="mt-4" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
              ) : (
                <Sparkle size={16} weight="duotone" className="mr-2" />
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
      {/* Stale banner */}
      {isProfileStale && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Warning size={16} weight="duotone" className="text-amber-600 shrink-0" />
            <span className="text-[13px] text-amber-800">
              Hiring strategy updated since this profile was generated.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            {isGenerating ? (
              <CircleNotch size={14} weight="bold" className="mr-1.5 animate-spin" />
            ) : (
              <Sparkle size={14} weight="duotone" className="mr-1.5" />
            )}
            Regenerate
          </Button>
        </div>
      )}

      {/* Header — regenerate with confirmation */}
      <div className="flex items-center justify-end gap-2">
        {isSaving && (
          <span className="text-[12px] text-muted-foreground">Saving...</span>
        )}
        {showRegenConfirm ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
            <span className="text-[13px] text-amber-800">Replace entire profile?</span>
            <Button size="sm" variant="ghost" onClick={() => setShowRegenConfirm(false)} className="h-7 px-2">
              Cancel
            </Button>
            <Button size="sm" onClick={handleRegenerate} disabled={isGenerating} className="h-7 px-3">
              {isGenerating ? (
                <CircleNotch size={14} weight="bold" className="mr-1 animate-spin" />
              ) : (
                <Sparkle size={14} weight="duotone" className="mr-1" />
              )}
              Confirm
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRegenConfirm(true)}
            disabled={anyBusy}
            aria-label="Regenerate profile"
          >
            {isGenerating ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" />
            ) : (
              <Sparkle size={16} weight="duotone" />
            )}
          </Button>
        )}
      </div>

      {/* Ideal Background */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        {renderSectionHeader("Ideal Background", "ideal_background")}
        {editingField === "ideal_background" ? (
          <div className="space-y-3">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="text-[14px] min-h-[100px] resize-none leading-relaxed"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={!editValue.trim()}>
                <Check size={14} className="mr-1.5" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {candidateProfile.ideal_background || "Not set"}
          </p>
        )}
        {renderRefinePanel("ideal_background")}
      </div>

      {/* Experience Range */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        {renderSectionHeader("Experience Range", "experience_range")}
        {editingField === "experience_range" ? (
          <div className="space-y-3">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="text-[14px]"
              placeholder="e.g. 5-8 years"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={!editValue.trim()}>
                <Check size={14} className="mr-1.5" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {candidateProfile.experience_range || "Not set"}
          </p>
        )}
        {renderRefinePanel("experience_range")}
      </div>

      {/* Must-Have Skills */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        {renderSectionHeader("Must-Have Skills", "must_have_skills")}
        {editingField === "must_have_skills" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {editSkills.map((s, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-800"
                >
                  {s}
                  <button onClick={() => removeSkill(i)} className="hover:text-red-600">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newItemInput}
                onChange={(e) => setNewItemInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Add skill and press Enter"
                className="text-[13px] flex-1"
              />
              <Button variant="outline" size="sm" onClick={addSkill} disabled={!newItemInput.trim()}>
                <Plus size={14} className="mr-1" /> Add
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
              <Button size="sm" onClick={saveEdit}>
                <Check size={14} className="mr-1.5" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(candidateProfile.must_have_skills ?? []).map((s) => (
              <span
                key={s}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-800"
              >
                {s}
              </span>
            ))}
            {(!candidateProfile.must_have_skills || candidateProfile.must_have_skills.length === 0) && (
              <span className="text-[13px] text-muted-foreground">No skills set</span>
            )}
          </div>
        )}
        {renderRefinePanel("must_have_skills")}
      </div>

      {/* Nice-to-Have Skills */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        {renderSectionHeader("Nice-to-Have Skills", "nice_to_have_skills")}
        {editingField === "nice_to_have_skills" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {editSkills.map((s, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-[13px] font-medium text-foreground"
                >
                  {s}
                  <button onClick={() => removeSkill(i)} className="hover:text-destructive">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newItemInput}
                onChange={(e) => setNewItemInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Add skill and press Enter"
                className="text-[13px] flex-1"
              />
              <Button variant="outline" size="sm" onClick={addSkill} disabled={!newItemInput.trim()}>
                <Plus size={14} className="mr-1" /> Add
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
              <Button size="sm" onClick={saveEdit}>
                <Check size={14} className="mr-1.5" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(candidateProfile.nice_to_have_skills ?? []).map((s) => (
              <span
                key={s}
                className="rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-[13px] font-medium text-foreground"
              >
                {s}
              </span>
            ))}
            {(!candidateProfile.nice_to_have_skills || candidateProfile.nice_to_have_skills.length === 0) && (
              <span className="text-[13px] text-muted-foreground">No skills set</span>
            )}
          </div>
        )}
        {renderRefinePanel("nice_to_have_skills")}
      </div>

      {/* Cultural Fit Indicators */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        {renderSectionHeader("Cultural Fit Indicators", "cultural_fit_indicators")}
        {editingField === "cultural_fit_indicators" ? (
          <div className="space-y-3">
            <ul className="space-y-2">
              {editIndicators.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                  <Input
                    value={c}
                    onChange={(e) => updateIndicator(i, e.target.value)}
                    className="text-[14px] flex-1"
                  />
                  <button
                    onClick={() => removeIndicator(i)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={newItemInput}
                onChange={(e) => setNewItemInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIndicator())}
                placeholder="Add indicator and press Enter"
                className="text-[13px] flex-1"
              />
              <Button variant="outline" size="sm" onClick={addIndicator} disabled={!newItemInput.trim()}>
                <Plus size={14} className="mr-1" /> Add
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
              <Button size="sm" onClick={saveEdit}>
                <Check size={14} className="mr-1.5" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {(candidateProfile.cultural_fit_indicators ?? []).map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                {c}
              </li>
            ))}
            {(!candidateProfile.cultural_fit_indicators || candidateProfile.cultural_fit_indicators.length === 0) && (
              <span className="text-[13px] text-muted-foreground">No indicators set</span>
            )}
          </ul>
        )}
        {renderRefinePanel("cultural_fit_indicators")}
      </div>
    </div>
  );
}
