"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  EnvelopeSimple,
  Eye,
  Info,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailTemplate {
  id: string;
  name: string;
  template_type: string;
  subject: string;
  body_html: string;
  is_active: boolean;
}

const TEMPLATE_TYPES = [
  "prep",
  "reminder",
  "invite",
  "feedback_submitted",
  "all_feedback_collected",
  "synthesis_ready",
  "stage_assigned",
  "feedback_reminder",
] as const;

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  prep: "Prep",
  reminder: "Reminder",
  invite: "Invite",
  feedback_submitted: "Feedback Submitted",
  all_feedback_collected: "All Feedback Collected",
  synthesis_ready: "Synthesis Ready",
  stage_assigned: "Stage Assigned",
  feedback_reminder: "Feedback Reminder",
};

const TEMPLATE_TYPE_DESCRIPTIONS: Record<string, string> = {
  prep: "Sent to interviewers before an interview with focus areas and questions",
  reminder: "Sent to interviewers who haven't submitted feedback yet",
  invite: "Sent to collaborators when they are invited to a hiring plan",
  feedback_submitted: "Sent to the manager when a collaborator submits interview feedback",
  all_feedback_collected: "Sent to the manager when all collaborators have submitted feedback for an interview",
  synthesis_ready: "Sent to the manager when AI synthesis is complete for a candidate",
  stage_assigned: "Sent to a collaborator when they are assigned to new interview stages",
  feedback_reminder: "Daily reminder sent to collaborators who have not yet submitted feedback",
};

const VARIABLES = [
  { key: "candidate_name", description: "Candidate's first name", example: "Jane" },
  { key: "role_title", description: "Hiring plan/role title", example: "Software Engineer" },
  { key: "stage_name", description: "Interview stage name", example: "Technical Interview" },
  { key: "interviewer_name", description: "Interviewer's name", example: "Alice" },
  { key: "playbook_link", description: "Link to the hiring plan", example: "https://app.axil.ie/playbooks/..." },
] as const;

const SAMPLE_DATA: Record<string, string> = Object.fromEntries(
  VARIABLES.map((v) => [v.key, v.example]),
);

const EMPTY_FORM = {
  name: "",
  template_type: "",
  subject: "",
  body_html: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function previewText(template: string): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (match, key: string) => SAMPLE_DATA[key] ?? match,
  );
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  prep: { bg: "bg-teal-50", text: "text-teal-700" },
  reminder: { bg: "bg-amber-50", text: "text-amber-700" },
  invite: { bg: "bg-blue-50", text: "text-blue-700" },
  feedback_submitted: { bg: "bg-green-50", text: "text-green-700" },
  all_feedback_collected: { bg: "bg-emerald-50", text: "text-emerald-700" },
  synthesis_ready: { bg: "bg-purple-50", text: "text-purple-700" },
  stage_assigned: { bg: "bg-indigo-50", text: "text-indigo-700" },
  feedback_reminder: { bg: "bg-orange-50", text: "text-orange-700" },
};

function typeBadge(type: string) {
  const colors = TYPE_COLORS[type] ?? { bg: "bg-gray-50", text: "text-gray-700" };
  return `${colors.bg} ${colors.text}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailTemplateEditor() {
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPreview, setShowPreview] = useState(false);

  // Ref for body textarea to insert variables at cursor
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cms/email-templates");
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load email templates");
      }
      const data: EmailTemplate[] = await res.json();
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load email templates",
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
    setShowPreview(false);
    setModalOpen(true);
  }

  function openEdit(item: EmailTemplate) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      template_type: item.template_type,
      subject: item.subject,
      body_html: item.body_html,
    });
    setShowPreview(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowPreview(false);
  }

  // -------------------------------------------------------------------------
  // Variable insertion
  // -------------------------------------------------------------------------

  function insertVariable(varKey: string) {
    const snippet = `{{${varKey}}}`;
    const textarea = bodyRef.current;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = form.body_html.slice(0, start);
      const after = form.body_html.slice(end);
      const newVal = before + snippet + after;
      setForm((prev) => ({ ...prev, body_html: newVal }));

      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = start + snippet.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    } else {
      navigator.clipboard.writeText(snippet).catch(() => {
        toast.error("Failed to copy to clipboard");
      });
      toast.success(`Copied ${snippet}`);
    }
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.template_type) {
      toast.error("Template type is required");
      return;
    }
    if (!form.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!form.body_html.trim()) {
      toast.error("Body is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      template_type: form.template_type,
      subject: form.subject.trim(),
      body_html: form.body_html.trim(),
    };

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/cms/email-templates/${editingId}`
        : "/api/admin/cms/email-templates";
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

      const saved: EmailTemplate = await res.json();

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
        `/api/admin/cms/email-templates/${deleteTarget.id}`,
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
  // Preview memos
  // -------------------------------------------------------------------------

  const previewSubject = useMemo(
    () => previewText(form.subject),
    [form.subject],
  );
  const previewBody = useMemo(
    () => previewText(form.body_html),
    [form.body_html],
  );

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
            <EnvelopeSimple
              size={24}
              weight="duotone"
              className="text-teal-500"
            />
          </div>
          <h3 className="text-[15px] font-semibold">
            No email templates yet
          </h3>
          <p className="mt-1 max-w-sm text-center text-[13px] text-muted-foreground">
            Add your first email template to define reusable notification
            formats for interview prep, reminders, and invites.
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
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${typeBadge(item.template_type)}`}
                    >
                      {TEMPLATE_TYPE_LABELS[item.template_type] ?? item.template_type}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {item.subject}
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
              <EnvelopeSimple
                size={20}
                weight="duotone"
                className="text-teal-600"
              />
              {editingId ? "Edit Email Template" : "New Email Template"}
            </DialogTitle>
            <DialogDescription>
              Create a reusable email template. Use {"{{variables}}"} to insert dynamic content that gets replaced when the email is sent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-3">
            {/* Row 1: Name + Type side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="email-name"
                  className="text-[12px] font-medium text-muted-foreground"
                >
                  Template Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Interview Prep Email"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label
                  htmlFor="email-type"
                  className="text-[12px] font-medium text-muted-foreground"
                >
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.template_type}
                  onValueChange={(val) =>
                    setForm((prev) => ({ ...prev, template_type: val }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TEMPLATE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label
                htmlFor="email-subject"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Subject Line <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email-subject"
                value={form.subject}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder="e.g. Prepare for your {{stage_name}} with {{candidate_name}}"
                className="mt-1.5"
              />
            </div>

            {/* Body */}
            <div>
              <Label
                htmlFor="email-body"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Email Body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="email-body"
                ref={bodyRef}
                value={form.body_html}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, body_html: e.target.value }))
                }
                placeholder={"Hi {{interviewer_name}},\n\nYou have an upcoming {{stage_name}} for the {{role_title}} role with {{candidate_name}}.\n\nView the hiring plan: {{playbook_link}}"}
                rows={7}
                className="mt-1.5 font-mono text-[13px]"
              />
            </div>

            {/* Variables reference */}
            <div className="rounded-lg border border-teal-200/60 bg-teal-50/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info size={15} weight="duotone" className="text-teal-600" />
                <p className="text-[12px] font-semibold text-teal-800">
                  Variables
                </p>
                <span className="text-[11px] text-teal-600/70">
                  Click to insert at cursor position in the body
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="rounded-md bg-white/80 px-2.5 py-1.5 text-left hover:bg-teal-100/60 transition-colors border border-teal-200/50"
                    title={`${v.description} (e.g. ${v.example})`}
                  >
                    <code className="text-[12px] font-medium text-teal-700">
                      {`{{${v.key}}}`}
                    </code>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {v.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-teal-700 transition-colors"
              >
                <Eye size={15} weight="duotone" />
                {showPreview ? "Hide preview" : "Preview with sample data"}
              </button>

              {showPreview && (form.subject || form.body_html) && (
                <div className="mt-3 rounded-lg border border-border/40 bg-white p-5 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Subject</span>
                  </div>
                  {form.subject && (
                    <p className="text-[14px] font-medium text-foreground">
                      {previewSubject}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1 pb-2 border-b border-border/30">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Body</span>
                  </div>
                  {form.body_html && (
                    <p className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {previewBody}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-border/30">
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
              {editingId ? "Save Changes" : "Create Template"}
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
            ? This will deactivate the template so it no longer appears when
            sending notifications.
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
