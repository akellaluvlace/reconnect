"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");

  const faQuestions = questions.filter((q) => q.focus_area === focusArea);

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
      });

      if (!res.ok) throw new Error("Failed to regenerate questions");

      const { data } = await res.json();
      const newQuestions = data.questions.map(
        (q: { question: string; purpose: string; look_for: string[] }) => ({
          ...q,
          focus_area: focusArea,
        }),
      );

      // Replace questions for this focus area, keep others
      const updated = [
        ...questions.filter((q) => q.focus_area !== focusArea),
        ...newQuestions,
      ];
      onQuestionsChange(updated);

      // Save to stage
      const saveRes = await fetch(`/api/playbooks/${playbookId}/stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggested_questions: updated }),
      });
      if (!saveRes.ok) {
        console.error("[questions] Post-regeneration save failed:", saveRes.status);
        toast.error("Questions regenerated but failed to save");
      }
    } catch (err) {
      console.error("[questions] Regeneration failed:", err);
      toast.error("Failed to regenerate questions");
    } finally {
      setIsRegenerating(false);
    }
  }

  function handleAddCustom() {
    if (!newQuestion.trim()) return;

    const custom: SuggestedQuestion = {
      question: newQuestion.trim(),
      purpose: "Custom question",
      look_for: [],
      focus_area: focusArea,
    };

    const updated = [...questions, custom];
    onQuestionsChange(updated);
    setNewQuestion("");

    // Fire-and-forget save
    fetch(`/api/playbooks/${playbookId}/stages/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggested_questions: updated }),
    }).catch((err) => {
      console.error("[questions] Save failed:", err);
      toast.error("Failed to save question");
    });
  }

  function handleDelete(index: number) {
    const allFaQuestions = questions.filter((q) => q.focus_area === focusArea);
    const toDelete = allFaQuestions[index];
    if (!toDelete) return;

    const updated = questions.filter((q) => q !== toDelete);
    onQuestionsChange(updated);

    fetch(`/api/playbooks/${playbookId}/stages/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggested_questions: updated }),
    }).catch((err) => {
      console.error("[questions] Delete save failed:", err);
      toast.error("Failed to save changes");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Questions ({faQuestions.length})
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="h-6 text-xs"
        >
          {isRegenerating ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          Regenerate
        </Button>
      </div>

      {faQuestions.map((q, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-md bg-muted/30 px-2 py-1.5"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs">{q.question}</p>
            {q.look_for.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {q.look_for.map((lf, li) => (
                  <Badge
                    key={li}
                    variant="secondary"
                    className="text-[10px] px-1 py-0"
                  >
                    {lf}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(i)}
            className="h-5 w-5 p-0 shrink-0"
            aria-label="Delete question"
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}

      <div className="flex gap-1">
        <Input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Add custom question..."
          className="text-xs h-7"
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
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
