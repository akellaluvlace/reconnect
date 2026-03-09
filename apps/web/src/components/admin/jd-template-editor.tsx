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
  FileText,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JdContent {
  summary: string;
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
}

interface JdTemplate {
  id: string;
  name: string;
  content: JdContent;
  style: string | null;
  is_active: boolean;
}

const JD_STYLES = ["formal", "creative", "concise"] as const;

const EMPTY_FORM = {
  name: "",
  style: "",
  summary: "",
  responsibilities: "",
  qualifications: "",
  benefits: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split a newline-delimited string into a trimmed, non-empty array. */
function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Join an array of strings with newlines for textarea display. */
function arrayToLines(arr: string[] | null | undefined): string {
  return (arr ?? []).join("\n");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JdTemplateEditor() {
  const [items, setItems] = useState<JdTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<JdTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cms/jd-templates");
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load JD templates");
      }
      const data: JdTemplate[] = await res.json();
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load JD templates",
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
    setModalOpen(true);
  }

  function openEdit(item: JdTemplate) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      style: item.style ?? "",
      summary: item.content?.summary ?? "",
      responsibilities: arrayToLines(item.content?.responsibilities),
      qualifications: arrayToLines(item.content?.qualifications),
      benefits: arrayToLines(item.content?.benefits),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const content: JdContent = {
      summary: form.summary.trim(),
      responsibilities: linesToArray(form.responsibilities),
      qualifications: linesToArray(form.qualifications),
      benefits: linesToArray(form.benefits),
    };

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      content,
    };
    if (form.style) payload.style = form.style;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/cms/jd-templates/${editingId}`
        : "/api/admin/cms/jd-templates";
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

      const saved: JdTemplate = await res.json();

      if (editingId) {
        setItems((prev) =>
          prev.map((it) => (it.id === saved.id ? saved : it)),
        );
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
        `/api/admin/cms/jd-templates/${deleteTarget.id}`,
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
        {Array.from({ length: 3 }).map((_, i) => (
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
            <FileText size={24} weight="duotone" className="text-teal-500" />
          </div>
          <h3 className="text-[15px] font-semibold">
            No JD templates yet
          </h3>
          <p className="mt-1 max-w-sm text-center text-[13px] text-muted-foreground">
            Add your first job description template to provide reusable
            structures for playbook creation.
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
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-foreground truncate">
                      {item.name}
                    </p>
                    {item.style && (
                      <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                        {item.style}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {item.content?.summary
                      ? item.content.summary.slice(0, 100) +
                        (item.content.summary.length > 100 ? "..." : "")
                      : "No summary"}
                  </p>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText
                size={20}
                weight="duotone"
                className="text-teal-600"
              />
              {editingId ? "Edit JD Template" : "Add JD Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-3">
            {/* Name */}
            <div>
              <Label
                htmlFor="jd-name"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jd-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Standard Engineering JD"
                className="mt-1 text-[14px]"
              />
            </div>

            {/* Style */}
            <div>
              <Label
                htmlFor="jd-style"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Style
              </Label>
              <Select
                value={form.style}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, style: val }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {JD_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div>
              <Label
                htmlFor="jd-summary"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Summary
              </Label>
              <Textarea
                id="jd-summary"
                value={form.summary}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, summary: e.target.value }))
                }
                placeholder="Brief overview of the role..."
                rows={3}
                className="mt-1 text-[14px]"
              />
            </div>

            {/* Responsibilities */}
            <div>
              <Label
                htmlFor="jd-responsibilities"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Responsibilities{" "}
                <span className="text-muted-foreground/60 font-normal">
                  (one per line)
                </span>
              </Label>
              <Textarea
                id="jd-responsibilities"
                value={form.responsibilities}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    responsibilities: e.target.value,
                  }))
                }
                placeholder={"Design and implement features\nCollaborate with cross-functional teams\nMentor junior engineers"}
                rows={4}
                className="mt-1 text-[14px]"
              />
            </div>

            {/* Qualifications */}
            <div>
              <Label
                htmlFor="jd-qualifications"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Qualifications{" "}
                <span className="text-muted-foreground/60 font-normal">
                  (one per line)
                </span>
              </Label>
              <Textarea
                id="jd-qualifications"
                value={form.qualifications}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    qualifications: e.target.value,
                  }))
                }
                placeholder={"3+ years experience\nStrong communication skills\nRelevant degree or equivalent"}
                rows={4}
                className="mt-1 text-[14px]"
              />
            </div>

            {/* Benefits */}
            <div>
              <Label
                htmlFor="jd-benefits"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Benefits{" "}
                <span className="text-muted-foreground/60 font-normal">
                  (one per line)
                </span>
              </Label>
              <Textarea
                id="jd-benefits"
                value={form.benefits}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, benefits: e.target.value }))
                }
                placeholder={"Competitive salary\nFlexible working\nHealth insurance"}
                rows={3}
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
