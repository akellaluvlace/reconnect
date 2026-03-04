"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkle,
  Plus,
  Trash,
  CircleNotch,
  PencilSimple,
  Check,
  X,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import type { SuggestedQuestion } from "@reconnect/database";

interface QuestionBankProps {
  playbookId: string;
  stageId: string;
  focusArea: string;
  focusAreaDescription: string;
  stageType: string;
  role: string;
  level: string;
  questions: SuggestedQuestion[];
  onQuestionsChange: (questions: SuggestedQuestion[]) => void;
}

interface Alternative {
  question: string;
  purpose: string;
  look_for: string[];
}

export function QuestionBank({
  playbookId,
  stageId,
  focusArea,
  focusAreaDescription,
  stageType,
  role,
  level,
  questions,
  onQuestionsChange,
}: QuestionBankProps) {
  // Per-question state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editPurpose, setEditPurpose] = useState("");

  // Refine state (per-question AI alternatives)
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const [refineGuidance, setRefineGuidance] = useState("");
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [isRefining, setIsRefining] = useState(false);

  // Generate from prompt state
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateAlternatives, setGenerateAlternatives] = useState<Alternative[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Bulk regenerate state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  // Custom question state
  const [newQuestion, setNewQuestion] = useState("");

  const faQuestions = questions.filter((q) => q.focus_area === focusArea);

  // ── Save helper ──
  function saveQuestions(updated: SuggestedQuestion[]) {
    const previous = questions;
    onQuestionsChange(updated);
    fetch(`/api/playbooks/${playbookId}/stages/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggested_questions: updated }),
    })
      .then((res) => {
        if (handleSessionExpired(res)) return;
        if (!res.ok) {
          console.error("[questions] Save failed: HTTP", res.status);
          toast.error("Failed to save question changes");
          onQuestionsChange(previous);
        } else {
          console.log(`[questions] Save OK { fa="${focusArea}", count=${updated.filter((q) => q.focus_area === focusArea).length} }`);
        }
      })
      .catch((err) => {
        console.error("[questions] Save failed:", err);
        toast.error("Failed to save changes");
        onQuestionsChange(previous);
      });
  }

  // ── Per-question: Edit inline ──
  function startEdit(index: number) {
    const q = faQuestions[index];
    if (!q) return;
    setEditingIndex(index);
    setEditText(q.question);
    setEditPurpose(q.purpose);
    setRefiningIndex(null);
    setAlternatives([]);
  }

  function saveEdit() {
    if (editingIndex === null || !editText.trim()) return;
    const target = faQuestions[editingIndex];
    if (!target) return;

    const updated = questions.map((q) =>
      q === target
        ? { ...q, question: editText.trim(), purpose: editPurpose.trim() || q.purpose }
        : q,
    );
    saveQuestions(updated);
    setEditingIndex(null);
  }

  function cancelEdit() {
    setEditingIndex(null);
  }

  // ── Per-question: AI Refine ──
  function startRefine(index: number) {
    setRefiningIndex(index);
    setRefineGuidance("");
    setAlternatives([]);
    setEditingIndex(null);
  }

  async function handleRefine() {
    if (refiningIndex === null) return;
    const target = faQuestions[refiningIndex];
    if (!target) return;

    setIsRefining(true);
    setAlternatives([]);

    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "refine",
          role,
          level,
          focus_area: focusArea,
          focus_area_description: focusAreaDescription,
          stage_type: stageType,
          current_question: target.question,
          guidance: refineGuidance || undefined,
          existing_questions: faQuestions
            .filter((_, i) => i !== refiningIndex)
            .map((q) => q.question),
        }),
        signal: AbortSignal.timeout(60_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("AI request timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) throw new Error("Failed to get suggestions");

      const { data } = await res.json();
      const alts = data?.alternatives;
      if (!Array.isArray(alts) || alts.length === 0) {
        toast.warning("AI returned no suggestions — try different guidance");
        return;
      }
      console.log(`[questions] Refine OK { fa="${focusArea}", alternatives=${alts.length} }`);
      setAlternatives(alts);
    } catch (err) {
      console.error("[questions] Refine failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setIsRefining(false);
    }
  }

  function acceptAlternative(alt: Alternative) {
    if (refiningIndex === null) return;
    const target = faQuestions[refiningIndex];
    if (!target) return;

    const updated = questions.map((q) =>
      q === target
        ? { question: alt.question, purpose: alt.purpose, look_for: alt.look_for, focus_area: focusArea }
        : q,
    );
    saveQuestions(updated);
    setRefiningIndex(null);
    setAlternatives([]);
    setRefineGuidance("");
  }

  function cancelRefine() {
    setRefiningIndex(null);
    setAlternatives([]);
    setRefineGuidance("");
  }

  // ── AI Generate from prompt ──
  async function handleGenerateFromPrompt() {
    if (!generatePrompt.trim()) return;

    setIsGenerating(true);
    setGenerateAlternatives([]);

    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "refine",
          role,
          level,
          focus_area: focusArea,
          focus_area_description: focusAreaDescription,
          stage_type: stageType,
          current_question: generatePrompt.trim(),
          guidance: "Create interview questions based on this direction. The 'current question' field contains the user's description of what they want to assess, not an actual question to refine.",
          existing_questions: faQuestions.map((q) => q.question),
        }),
        signal: AbortSignal.timeout(60_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("AI request timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) throw new Error("Failed to generate question");

      const { data } = await res.json();
      const alts = data?.alternatives;
      if (!Array.isArray(alts) || alts.length === 0) {
        toast.warning("AI returned no suggestions — try rephrasing");
        return;
      }
      console.log(`[questions] Generate OK { fa="${focusArea}", prompt="${generatePrompt.trim().slice(0, 40)}", alternatives=${alts.length} }`);
      setGenerateAlternatives(alts);
    } catch (err) {
      console.error("[questions] Generate from prompt failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to generate question");
    } finally {
      setIsGenerating(false);
    }
  }

  function addGeneratedQuestion(alt: Alternative) {
    const newQ: SuggestedQuestion = {
      question: alt.question,
      purpose: alt.purpose,
      look_for: alt.look_for,
      focus_area: focusArea,
    };
    const updated = [...questions, newQ];
    saveQuestions(updated);
    setGenerateAlternatives((prev) => {
      const remaining = prev.filter((a) => a !== alt);
      if (remaining.length === 0) setGeneratePrompt("");
      return remaining;
    });
  }

  // ── Delete ──
  function handleDelete(index: number) {
    const target = faQuestions[index];
    if (!target) return;
    const updated = questions.filter((q) => q !== target);
    saveQuestions(updated);
    if (editingIndex !== null) {
      if (editingIndex === index) setEditingIndex(null);
      else if (editingIndex > index) setEditingIndex(editingIndex - 1);
    }
    if (refiningIndex !== null) {
      if (refiningIndex === index) {
        setRefiningIndex(null);
        setAlternatives([]);
      } else if (refiningIndex > index) {
        setRefiningIndex(refiningIndex - 1);
      }
    }
  }

  // ── Bulk regenerate (secondary) ──
  async function handleRegenerate() {
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          level,
          focus_area: focusArea,
          focus_area_description: focusAreaDescription,
          stage_type: stageType,
          existing_questions: faQuestions.map((q) => q.question),
        }),
        signal: AbortSignal.timeout(60_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("AI request timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) throw new Error("Failed to regenerate questions");

      const { data } = await res.json();
      if (!Array.isArray(data?.questions) || data.questions.length === 0) {
        throw new Error("AI returned no questions — please try again");
      }
      const newQuestions = data.questions.map(
        (q: { question: string; purpose: string; look_for: string[] }) => ({
          ...q,
          focus_area: focusArea,
        }),
      );
      const updated = [
        ...questions.filter((q) => q.focus_area !== focusArea),
        ...newQuestions,
      ];
      console.log(`[questions] Regenerate ALL OK { fa="${focusArea}", new=${newQuestions.length} }`);
      saveQuestions(updated);
      toast.success(`Regenerated ${newQuestions.length} questions`);
    } catch (err) {
      console.error("[questions] Regeneration failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setIsRegenerating(false);
    }
  }

  // ── Add custom ──
  function handleAddCustom() {
    if (!newQuestion.trim()) return;
    const custom: SuggestedQuestion = {
      question: newQuestion.trim(),
      purpose: "Custom question",
      look_for: [],
      focus_area: focusArea,
    };
    saveQuestions([...questions, custom]);
    setNewQuestion("");
  }

  const anyBusy = isRefining || isGenerating || isRegenerating;

  // ── Shared alternative card renderer ──
  function renderAlternativeCard(
    alt: Alternative,
    action: { label: string; icon?: React.ReactNode; onClick: () => void },
  ) {
    return (
      <div className="group rounded-lg border border-teal-200/60 bg-white px-5 py-4 hover:border-teal-400 hover:shadow-sm transition-all">
        <p className="text-[14px] leading-relaxed text-foreground font-medium">{alt.question}</p>
        <p className="mt-2 text-[13px] text-muted-foreground leading-snug">{alt.purpose}</p>
        {alt.look_for.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {alt.look_for.map((lf, li) => (
              <Badge key={li} variant="secondary" className="text-xs px-2 py-0.5 font-normal bg-teal-50 text-teal-700 border border-teal-200/50">
                {lf}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className="h-8 text-[13px] px-4 border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 font-medium"
          >
            {action.icon}
            {action.label}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-6">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h4 className="text-sm font-semibold text-foreground tracking-tight">
          Interview Questions
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({faQuestions.length})
          </span>
        </h4>
        {confirmRegenerate ? (
          <span className="flex items-center gap-3 text-sm">
            <span className="text-destructive font-medium">Replace all questions?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { setConfirmRegenerate(false); handleRegenerate(); }}
              disabled={anyBusy}
              className="h-7 text-xs px-3"
            >
              Yes, replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRegenerate(false)}
              className="h-7 text-xs px-3"
            >
              Cancel
            </Button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmRegenerate(true)}
            disabled={anyBusy}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            {isRegenerating ? (
              <>
                <CircleNotch size={12} weight="bold" className="animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <ArrowsClockwise size={12} />
                Regenerate all
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Question list ── */}
      <div className="space-y-4">
        {faQuestions.map((q, i) => (
          <div
            key={`${q.focus_area}-${q.question.slice(0, 60)}-${i}`}
            className="rounded-xl border border-border/40 bg-card p-5"
          >
            {editingIndex === i ? (
              /* ── Inline Edit Mode ── */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">Question</label>
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="text-[14px] min-h-[100px] resize-none leading-relaxed"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">Purpose</label>
                  <Input
                    value={editPurpose}
                    onChange={(e) => setEditPurpose(e.target.value)}
                    placeholder="What this question evaluates"
                    className="text-[14px] h-10"
                    autoComplete="off"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-border/20">
                  <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-9 text-sm px-4">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={!editText.trim()} className="h-9 text-sm px-4">
                    <Check size={14} className="mr-1.5" /> Save changes
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Display Mode ── */
              <div className="flex items-start gap-4">
                {/* Question number */}
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-[14px] leading-relaxed text-foreground font-medium">{q.question}</p>
                  {q.purpose && q.purpose !== "Custom question" && (
                    <p className="text-[13px] text-muted-foreground leading-snug">{q.purpose}</p>
                  )}
                  {q.look_for.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {q.look_for.map((lf, li) => (
                        <Badge key={li} variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                          {lf}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => startEdit(i)}
                    disabled={anyBusy}
                    className="rounded-lg p-2 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                    aria-label="Edit question"
                    title="Edit manually"
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    onClick={() => startRefine(i)}
                    disabled={anyBusy}
                    className="rounded-lg p-2 text-muted-foreground/60 hover:text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-30"
                    aria-label="Get AI suggestions"
                    title="Get AI suggestions"
                  >
                    <Sparkle size={16} weight="duotone" />
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    disabled={anyBusy}
                    className="rounded-lg p-2 text-muted-foreground/60 hover:text-destructive hover:bg-red-50 transition-colors disabled:opacity-30"
                    aria-label="Delete question"
                    title="Delete"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── AI Refine Panel ── */}
            {refiningIndex === i && editingIndex !== i && (
              <div className="mt-5 rounded-xl border border-teal-200 bg-gradient-to-b from-teal-50/60 to-teal-50/20 p-5 space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100">
                    <Sparkle size={14} weight="duotone" className="text-teal-600" />
                  </div>
                  <span className="text-sm font-semibold text-teal-800">AI Suggestions</span>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={refineGuidance}
                    onChange={(e) => setRefineGuidance(e.target.value)}
                    placeholder="How should AI improve this? (optional)"
                    className="text-[14px] h-10 flex-1 bg-white"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRefine();
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleRefine}
                    disabled={isRefining}
                    className="h-10 text-sm bg-teal-600 hover:bg-teal-700 text-white px-5"
                  >
                    {isRefining ? (
                      <CircleNotch size={14} weight="bold" className="mr-2 animate-spin" />
                    ) : (
                      <Sparkle size={14} weight="duotone" className="mr-2" />
                    )}
                    Suggest
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelRefine} className="h-10 px-3">
                    <X size={16} />
                  </Button>
                </div>

                {/* Alternatives */}
                {alternatives.length > 0 && (
                  <div className="space-y-4 pt-1">
                    <p className="text-sm font-medium text-teal-800">Pick an alternative:</p>
                    {alternatives.map((alt, ai) => (
                      <div key={ai}>
                        {renderAlternativeCard(alt, {
                          label: "Use this",
                          onClick: () => acceptAlternative(alt),
                        })}
                      </div>
                    ))}
                    <button
                      onClick={cancelRefine}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Keep original
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── AI Generate from Prompt ── */}
      <div className="rounded-xl border border-dashed border-border/50 bg-muted/5 p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60">
            <Sparkle size={14} weight="duotone" className="text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">Generate with AI</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={generatePrompt}
            onChange={(e) => setGeneratePrompt(e.target.value)}
            placeholder="Describe what the question should assess..."
            className="text-[14px] h-10 flex-1"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && generatePrompt.trim()) handleGenerateFromPrompt();
            }}
          />
          <Button
            size="sm"
            onClick={handleGenerateFromPrompt}
            disabled={!generatePrompt.trim() || anyBusy}
            className="h-10 text-sm px-5"
          >
            {isGenerating ? (
              <CircleNotch size={14} weight="bold" className="mr-2 animate-spin" />
            ) : (
              <Sparkle size={14} weight="duotone" className="mr-2" />
            )}
            Generate
          </Button>
        </div>

        {/* Generated alternatives from prompt */}
        {generateAlternatives.length > 0 && (
          <div className="space-y-4 pt-2">
            <p className="text-sm font-medium text-teal-800">Pick questions to add:</p>
            {generateAlternatives.map((alt, ai) => (
              <div key={ai}>
                {renderAlternativeCard(alt, {
                  label: "Add",
                  icon: <Plus size={12} className="mr-1" />,
                  onClick: () => addGeneratedQuestion(alt),
                })}
              </div>
            ))}
            <button
              onClick={() => {
                setGenerateAlternatives([]);
                setGeneratePrompt("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ── Add Custom Question ── */}
      <div className="flex gap-2">
        <Input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Type a custom question..."
          className="text-[14px] h-10"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddCustom();
          }}
          autoComplete="off"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddCustom}
          disabled={!newQuestion.trim()}
          className="h-10 text-sm px-4"
        >
          <Plus size={14} className="mr-1.5" /> Add
        </Button>
      </div>
    </div>
  );
}
