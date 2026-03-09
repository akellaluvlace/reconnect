"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BookOpen, CircleNotch } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

interface CmsQuestion {
  id: string;
  question: string;
  purpose: string | null;
  look_for: string[] | null;
  category: string | null;
  stage_type: string | null;
}

interface QuestionBankPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (
    questions: { question: string; purpose: string; look_for: string[] }[]
  ) => void;
  existingQuestions: string[];
}

export function QuestionBankPicker({
  open,
  onClose,
  onSelect,
  existingQuestions,
}: QuestionBankPickerProps) {
  const [questions, setQuestions] = useState<CmsQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stageTypeFilter, setStageTypeFilter] = useState("all");

  // Normalize existing questions for comparison (lowercase, trimmed)
  const existingSet = useMemo(
    () => new Set(existingQuestions.map((q) => q.trim().toLowerCase())),
    [existingQuestions]
  );

  // Fetch questions when dialog opens
  const fetchQuestions = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cms_questions")
      .select("id, question, purpose, look_for, category, stage_type")
      .eq("is_active", true)
      .order("category")
      .order("question");

    // All state updates happen after the await — not synchronous in the effect
    setSelectedIds(new Set());
    setCategoryFilter("all");
    setStageTypeFilter("all");
    if (error) {
      console.error("[question-bank-picker] Fetch failed:", error);
      setQuestions([]);
    } else {
      setQuestions((data as CmsQuestion[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- fetch-on-open pattern
    fetchQuestions();
  }, [open, fetchQuestions]);

  // Derive filter options from fetched data
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      if (q.category) set.add(q.category);
    }
    return Array.from(set).sort();
  }, [questions]);

  const stageTypes = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      if (q.stage_type) set.add(q.stage_type);
    }
    return Array.from(set).sort();
  }, [questions]);

  // Filter questions
  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (categoryFilter !== "all" && q.category !== categoryFilter)
        return false;
      if (stageTypeFilter !== "all" && q.stage_type !== stageTypeFilter)
        return false;
      return true;
    });
  }, [questions, categoryFilter, stageTypeFilter]);

  function isAlreadyAdded(q: CmsQuestion): boolean {
    return existingSet.has(q.question.trim().toLowerCase());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleAdd() {
    const selected = questions.filter(
      (q) => selectedIds.has(q.id) && !isAlreadyAdded(q)
    );
    if (selected.length === 0) return;

    onSelect(
      selected.map((q) => ({
        question: q.question,
        purpose: q.purpose ?? "",
        look_for: q.look_for ?? [],
      }))
    );
  }

  const selectedCount = Array.from(selectedIds).filter((id) => {
    const q = questions.find((qq) => qq.id === id);
    return q && !isAlreadyAdded(q);
  }).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen
              size={20}
              weight="duotone"
              className="text-teal-600"
            />
            Question Bank
          </DialogTitle>
        </DialogHeader>

        {/* Filter controls */}
        {!loading && questions.length > 0 && (
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stageTypeFilter} onValueChange={setStageTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All stage types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stage types</SelectItem>
                {stageTypes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Question list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <CircleNotch
                size={20}
                weight="bold"
                className="animate-spin mr-2"
              />
              Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Your organization&apos;s question bank is empty.
              <br />
              Add questions in Admin &rarr; Question Bank.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No questions match the selected filters.
            </div>
          ) : (
            filtered.map((q) => {
              const alreadyAdded = isAlreadyAdded(q);
              const isSelected = selectedIds.has(q.id) || alreadyAdded;

              return (
                <label
                  key={q.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border border-border/40 transition-colors ${
                    alreadyAdded
                      ? "opacity-50 cursor-not-allowed bg-muted/20"
                      : "hover:bg-muted/30 cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (!alreadyAdded) toggleSelect(q.id);
                    }}
                    disabled={alreadyAdded}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-foreground">
                      {q.question}
                    </p>
                    {q.purpose && (
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {q.purpose}
                      </p>
                    )}
                    <div className="flex gap-1.5 mt-1">
                      {q.category && (
                        <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                          {q.category}
                        </span>
                      )}
                      {q.stage_type && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {q.stage_type}
                        </span>
                      )}
                      {alreadyAdded && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Already added
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selectedCount === 0}>
            Add {selectedCount} Question{selectedCount !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
