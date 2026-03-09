"use client";

import { useState, useEffect, useCallback } from "react";
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
  ListChecks,
  Clock,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StageTemplate {
  id: string;
  name: string;
  type: string | null;
  duration_minutes: number | null;
  focus_areas: string[] | null;
  suggested_questions: string[] | null;
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

const EMPTY_FORM = {
  name: "",
  type: "",
  duration_minutes: "",
  focus_areas: [] as string[],
  suggested_questions: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StageTemplateEditor() {
  const [items, setItems] = useState<StageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [focusAreaInput, setFocusAreaInput] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<StageTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cms/stage-templates");
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load templates");
      }
      const data: StageTemplate[] = await res.json();
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load templates",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // -------------------------------------------------------------------------
  // Modal helpers
  // -------------------------------------------------------------------------

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFocusAreaInput("");
    setModalOpen(true);
  }

  function openEdit(item: StageTemplate) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      type: item.type ?? "",
      duration_minutes:
        item.duration_minutes != null ? String(item.duration_minutes) : "",
      focus_areas: item.focus_areas ?? [],
      suggested_questions: (item.suggested_questions ?? []).join("\n"),
    });
    setFocusAreaInput("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFocusAreaInput("");
  }

  // -------------------------------------------------------------------------
  // Tag helpers (focus areas)
  // -------------------------------------------------------------------------

  function addFocusArea(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    // Split by comma for multi-add
    const newTags = trimmed
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !form.focus_areas.includes(t));
    if (newTags.length > 0) {
      setForm((prev) => ({
        ...prev,
        focus_areas: [...prev.focus_areas, ...newTags],
      }));
    }
    setFocusAreaInput("");
  }

  function removeFocusArea(index: number) {
    setForm((prev) => ({
      ...prev,
      focus_areas: prev.focus_areas.filter((_, i) => i !== index),
    }));
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const durationNum = form.duration_minutes
      ? parseInt(form.duration_minutes, 10)
      : undefined;
    if (form.duration_minutes && (isNaN(durationNum!) || durationNum! < 5 || durationNum! > 480)) {
      toast.error("Duration must be between 5 and 480 minutes");
      return;
    }

    const questionsArr = form.suggested_questions
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
    };
    if (form.type) payload.type = form.type;
    if (durationNum) payload.duration_minutes = durationNum;
    if (form.focus_areas.length > 0) payload.focus_areas = form.focus_areas;
    if (questionsArr.length > 0) payload.suggested_questions = questionsArr;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/cms/stage-templates/${editingId}`
        : "/api/admin/cms/stage-templates";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save template");
      }

      const saved: StageTemplate = await res.json();

      if (editingId) {
        setItems((prev) => prev.map((it) => (it.id === saved.id ? saved : it)));
        toast.success("Template updated");
      } else {
        setItems((prev) => [saved, ...prev]);
        toast.success("Template created");
      }

      closeModal();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save template",
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
        `/api/admin/cms/stage-templates/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete");
      }
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      toast.success("Template deleted");
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-card px-5 py-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
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
      {/* Add button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} weight="bold" className="mr-1" />
          Add Template
        </Button>
      </div>

      {/* List or empty state */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-cream-50 py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
            <ListChecks size={24} weight="duotone" className="text-teal-500" />
          </div>
          <h3 className="text-[15px] font-semibold">No stage templates yet</h3>
          <p className="mt-1 max-w-sm text-center text-[13px] text-muted-foreground">
            Add your first stage template to provide reusable interview stage
            configurations for playbook creation.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/40 bg-card px-5 py-3.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      {item.type && (
                        <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                          {item.type}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[12px] text-muted-foreground">
                      {item.duration_minutes != null && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} weight="duotone" />
                          {item.duration_minutes} min
                        </span>
                      )}
                      {item.focus_areas && item.focus_areas.length > 0 && (
                        <span>
                          {item.focus_areas.length} focus area
                          {item.focus_areas.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {item.suggested_questions &&
                        item.suggested_questions.length > 0 && (
                          <span>
                            {item.suggested_questions.length} question
                            {item.suggested_questions.length !== 1 ? "s" : ""}
                          </span>
                        )}
                    </div>
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
            {items.length} template{items.length !== 1 ? "s" : ""}
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
              <ListChecks
                size={20}
                weight="duotone"
                className="text-teal-600"
              />
              {editingId ? "Edit Template" : "Add Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-3">
            {/* Name */}
            <div>
              <Label
                htmlFor="template-name"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Technical Interview"
                className="mt-1 text-[14px]"
              />
            </div>

            {/* Type */}
            <div>
              <Label
                htmlFor="template-type"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Type
              </Label>
              <Select
                value={form.type}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, type: val }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
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

            {/* Duration */}
            <div>
              <Label
                htmlFor="template-duration"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Duration (minutes)
              </Label>
              <Input
                id="template-duration"
                type="number"
                min={5}
                max={480}
                value={form.duration_minutes}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    duration_minutes: e.target.value,
                  }))
                }
                placeholder="e.g. 60"
                className="mt-1 text-[14px]"
              />
            </div>

            {/* Focus Areas (tag input) */}
            <div>
              <Label className="text-[12px] font-medium text-muted-foreground">
                Focus Areas
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.focus_areas.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[12px] text-teal-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeFocusArea(i)}
                      className="hover:text-teal-900"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                placeholder="Type and press Enter to add"
                value={focusAreaInput}
                onChange={(e) => setFocusAreaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFocusArea(focusAreaInput);
                  }
                }}
                onBlur={() => {
                  if (focusAreaInput.trim()) addFocusArea(focusAreaInput);
                }}
                className="mt-1.5 text-[14px]"
              />
            </div>

            {/* Suggested Questions */}
            <div>
              <Label
                htmlFor="template-questions"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Suggested Questions{" "}
                <span className="text-muted-foreground/60 font-normal">
                  (one per line)
                </span>
              </Label>
              <Textarea
                id="template-questions"
                value={form.suggested_questions}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    suggested_questions: e.target.value,
                  }))
                }
                placeholder={"What experience do you have with...?\nDescribe a time when..."}
                rows={4}
                className="mt-1 text-[14px]"
              />
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
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name ?? "this template"}
            </span>
            ? This will deactivate the template so it no longer appears in new
            playbooks.
          </p>
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
