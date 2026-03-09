"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Plus,
  PencilSimple,
  Trash,
  CircleNotch,
  ChatDots,
  X,
  FunnelSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionItem {
  id: string;
  question: string;
  purpose: string | null;
  look_for: string[] | null;
  category: string | null;
  stage_type: string | null;
  is_active: boolean;
}

const STAGE_TYPES = [
  "screening",
  "technical",
  "behavioral",
  "panel",
  "reference",
  "other",
] as const;

const ALL_FILTER = "__all__";

const EMPTY_FORM = {
  question: "",
  purpose: "",
  look_for: [] as string[],
  category: "",
  stage_type: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuestionEditor() {
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState(ALL_FILTER);
  const [filterStageType, setFilterStageType] = useState(ALL_FILTER);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lookForInput, setLookForInput] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<QuestionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cms/questions");
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load questions");
      }
      const data: QuestionItem[] = await res.json();
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load questions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of items) {
      if (item.category) cats.add(item.category);
    }
    return Array.from(cats).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterCategory !== ALL_FILTER && item.category !== filterCategory)
        return false;
      if (
        filterStageType !== ALL_FILTER &&
        item.stage_type !== filterStageType
      )
        return false;
      return true;
    });
  }, [items, filterCategory, filterStageType]);

  // -------------------------------------------------------------------------
  // Modal helpers
  // -------------------------------------------------------------------------

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLookForInput("");
    setModalOpen(true);
  }

  function openEdit(item: QuestionItem) {
    setEditingId(item.id);
    setForm({
      question: item.question,
      purpose: item.purpose ?? "",
      look_for: item.look_for ?? [],
      category: item.category ?? "",
      stage_type: item.stage_type ?? "",
    });
    setLookForInput("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLookForInput("");
  }

  // -------------------------------------------------------------------------
  // Tag helpers (look_for)
  // -------------------------------------------------------------------------

  function addLookFor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const newTags = trimmed
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !form.look_for.includes(t));
    if (newTags.length > 0) {
      setForm((prev) => ({
        ...prev,
        look_for: [...prev.look_for, ...newTags],
      }));
    }
    setLookForInput("");
  }

  function removeLookFor(index: number) {
    setForm((prev) => ({
      ...prev,
      look_for: prev.look_for.filter((_, i) => i !== index),
    }));
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!form.question.trim()) {
      toast.error("Question is required");
      return;
    }

    const payload: Record<string, unknown> = {
      question: form.question.trim(),
    };
    if (form.purpose.trim()) payload.purpose = form.purpose.trim();
    if (form.look_for.length > 0) payload.look_for = form.look_for;
    if (form.category.trim()) payload.category = form.category.trim();
    if (form.stage_type) payload.stage_type = form.stage_type;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/cms/questions/${editingId}`
        : "/api/admin/cms/questions";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save question");
      }

      const saved: QuestionItem = await res.json();

      if (editingId) {
        setItems((prev) =>
          prev.map((it) => (it.id === saved.id ? saved : it)),
        );
        toast.success("Question updated");
      } else {
        setItems((prev) => [saved, ...prev]);
        toast.success("Question created");
      }

      closeModal();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save question",
      );
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/cms/questions/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete");
      }
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      toast.success("Question deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-card px-5 py-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Toolbar: filters + add */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <FunnelSimple size={14} weight="duotone" />
          Filters:
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] h-8 text-[13px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStageType} onValueChange={setFilterStageType}>
          <SelectTrigger className="w-[180px] h-8 text-[13px]">
            <SelectValue placeholder="Stage type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All stage types</SelectItem>
            {STAGE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} weight="bold" className="mr-1" />
          Add Question
        </Button>
      </div>

      {/* List or empty state */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-cream-50 py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
            <ChatDots size={24} weight="duotone" className="text-teal-500" />
          </div>
          <h3 className="text-[15px] font-semibold">
            {items.length === 0
              ? "No questions yet"
              : "No questions match filters"}
          </h3>
          <p className="mt-1 max-w-sm text-center text-[13px] text-muted-foreground">
            {items.length === 0
              ? "Add your first interview question to build your question bank."
              : "Try adjusting the filters above to see more questions."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/40 bg-card px-5 py-3.5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-foreground line-clamp-2">
                    {item.question}
                  </p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {item.category && (
                      <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                        {item.category}
                      </span>
                    )}
                    {item.stage_type && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        {item.stage_type}
                      </span>
                    )}
                    {item.purpose && (
                      <span className="text-[12px] text-muted-foreground truncate max-w-[300px]">
                        {item.purpose}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(item)}
                    aria-label="Edit"
                  >
                    <PencilSimple size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Delete"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <div className="px-1 pt-1 text-[12px] text-muted-foreground">
            {filteredItems.length} question
            {filteredItems.length !== 1 ? "s" : ""}
            {filteredItems.length !== items.length &&
              ` (${items.length} total)`}
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ChatDots
                size={20}
                weight="duotone"
                className="text-teal-600"
              />
              {editingId ? "Edit Question" : "Add Question"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-3">
            {/* Question */}
            <div>
              <Label
                htmlFor="question-text"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Question <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="question-text"
                value={form.question}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, question: e.target.value }))
                }
                placeholder="e.g. Tell me about a time you led a cross-functional project..."
                rows={3}
                className="mt-1 text-[14px]"
              />
            </div>

            {/* Purpose */}
            <div>
              <Label
                htmlFor="question-purpose"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Purpose
              </Label>
              <Input
                id="question-purpose"
                value={form.purpose}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, purpose: e.target.value }))
                }
                placeholder="e.g. Assess leadership and collaboration skills"
                className="mt-1 text-[14px]"
              />
            </div>

            {/* Look For (tag input) */}
            <div>
              <Label className="text-[12px] font-medium text-muted-foreground">
                What to Look For
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.look_for.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[12px] text-teal-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeLookFor(i)}
                      className="hover:text-teal-900"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                placeholder="Type and press Enter to add"
                value={lookForInput}
                onChange={(e) => setLookForInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLookFor(lookForInput);
                  }
                }}
                onBlur={() => {
                  if (lookForInput.trim()) addLookFor(lookForInput);
                }}
                className="mt-1.5 text-[14px]"
              />
            </div>

            {/* Category */}
            <div>
              <Label
                htmlFor="question-category"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Category
              </Label>
              <Input
                id="question-category"
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                placeholder="e.g. Leadership, Problem Solving"
                className="mt-1 text-[14px]"
              />
            </div>

            {/* Stage Type */}
            <div>
              <Label
                htmlFor="question-stage-type"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Stage Type
              </Label>
              <Select
                value={form.stage_type}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, stage_type: val }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select stage type" />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <CircleNotch
                  size={16}
                  weight="bold"
                  className="mr-2 animate-spin"
                />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-muted-foreground">
            Are you sure you want to delete this question? This will deactivate
            it so it no longer appears in new playbooks.
          </p>
          {deleteTarget && (
            <p className="text-[13px] text-foreground bg-muted/30 rounded-lg px-3 py-2 line-clamp-3">
              {deleteTarget.question}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <CircleNotch
                  size={16}
                  weight="bold"
                  className="animate-spin mr-1"
                />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
