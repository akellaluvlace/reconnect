"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  UsersThree,
  Trash,
  CircleNotch,
  EnvelopeSimple,
  CheckCircle,
  PencilSimple,
  BellRinging,
  Check,
  X,
  PaperPlaneTilt,
  UserPlus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import { cn } from "@/lib/utils";
import type { StageInfo, CollaboratorData } from "./alignment-page-client";

interface CollaboratorManagerProps {
  playbookId: string;
  playbookTitle: string;
  collaborators: CollaboratorData[];
  stages: StageInfo[];
  onUpdate: (collaborators: CollaboratorData[]) => void;
}

export function CollaboratorManager({
  playbookId,
  playbookTitle,
  collaborators,
  stages,
  onUpdate,
}: CollaboratorManagerProps) {
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("interviewer");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);

  // Editing assignments for existing collaborator
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStages, setEditStages] = useState<string[]>([]);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // Bulk invite
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState<string>("interviewer");
  const [bulkStages, setBulkStages] = useState<string[]>([]);
  const [isBulkInviting, setIsBulkInviting] = useState(false);

  // Email modals
  const [prepModal, setPrepModal] = useState<CollaboratorData | null>(null);
  const [reminderModal, setReminderModal] = useState<CollaboratorData | null>(null);
  const [prepBody, setPrepBody] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [sendingPrep, setSendingPrep] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  function toggleStage(stageId: string, stageList: string[], setList: (v: string[]) => void) {
    setList(
      stageList.includes(stageId)
        ? stageList.filter((s) => s !== stageId)
        : [...stageList, stageId],
    );
  }

  async function handleInvite() {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsInviting(true);
    try {
      const res = await fetch("/api/collaborators/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playbook_id: playbookId,
          email: email.trim(),
          name: name.trim() || undefined,
          role,
          assigned_stages: selectedStages.length > 0 ? selectedStages : undefined,
        }),
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send invite");
      }

      const { collaborator } = await res.json();
      onUpdate([collaborator, ...collaborators]);
      setEmail("");
      setName("");
      setSelectedStages([]);
      toast.success(`Invite sent to ${email.trim()}`);
    } catch (err) {
      console.error("[collaborators] Invite failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to send invite",
      );
    } finally {
      setIsInviting(false);
    }
  }

  function parseBulkEmails(text: string): string[] {
    return text
      .split(/[,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  }

  async function handleBulkInvite() {
    const emails = parseBulkEmails(bulkEmails);
    if (emails.length === 0) {
      toast.error("No valid email addresses found");
      return;
    }

    // Deduplicate against existing collaborators
    const existingEmails = new Set(collaborators.map((c) => c.email.toLowerCase()));
    const newEmails = emails.filter((e) => !existingEmails.has(e));
    const skipped = emails.length - newEmails.length;

    if (newEmails.length === 0) {
      toast.error("All emails are already invited");
      return;
    }

    setIsBulkInviting(true);
    const results = await Promise.allSettled(
      newEmails.map(async (emailAddr) => {
        const res = await fetch("/api/collaborators/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playbook_id: playbookId,
            email: emailAddr,
            role: bulkRole,
            assigned_stages: bulkStages.length > 0 ? bulkStages : undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed for ${emailAddr}`);
        }
        const { collaborator } = await res.json();
        return collaborator as CollaboratorData;
      }),
    );

    const succeeded: CollaboratorData[] = [];
    let failed = 0;
    for (const result of results) {
      if (result.status === "fulfilled") {
        succeeded.push(result.value);
      } else {
        failed++;
      }
    }

    if (succeeded.length > 0) {
      onUpdate([...succeeded, ...collaborators]);
    }

    const parts: string[] = [];
    if (succeeded.length > 0) parts.push(`${succeeded.length} invited`);
    if (failed > 0) parts.push(`${failed} failed`);
    if (skipped > 0) parts.push(`${skipped} already invited`);

    if (failed > 0) {
      toast.warning(parts.join(", "));
    } else {
      toast.success(parts.join(", "));
    }

    setShowBulkInvite(false);
    setBulkEmails("");
    setBulkStages([]);
    setIsBulkInviting(false);
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/collaborators/${id}`, {
        method: "DELETE",
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to revoke invite");
      }

      onUpdate(collaborators.filter((c) => c.id !== id));
      toast.success("Invite revoked");
    } catch (err) {
      console.error("[collaborators] Revoke failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke invite",
      );
    }
  }

  function startEditAssignment(collab: CollaboratorData) {
    setEditingId(collab.id);
    setEditStages(collab.assigned_stages ?? []);
  }

  async function saveAssignment(id: string) {
    setIsSavingAssignment(true);
    try {
      const res = await fetch(`/api/collaborators/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_stages: editStages.length > 0 ? editStages : null,
        }),
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update assignment");
      }

      onUpdate(
        collaborators.map((c) =>
          c.id === id
            ? { ...c, assigned_stages: editStages.length > 0 ? editStages : null }
            : c,
        ),
      );
      setEditingId(null);
      toast.success("Stage assignment updated");
    } catch (err) {
      console.error("[collaborators] Assignment update failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update assignment",
      );
    } finally {
      setIsSavingAssignment(false);
    }
  }

  // Generate editable prep email text
  function generatePrepText(collab: CollaboratorData): string {
    const name = collab.name || collab.email.split("@")[0];
    const collabStages = (!collab.assigned_stages || collab.assigned_stages.length === 0)
      ? stages
      : stages.filter((s) => collab.assigned_stages!.includes(s.id));

    let text = `Hi ${name},\n\nHere's your interview preparation brief. Please review the focus areas and questions below before your interview.\n`;

    for (const stage of collabStages) {
      text += `\n---\n${stage.name} (${stage.type}, ${stage.duration_minutes} min)\n`;

      if (stage.focus_areas && stage.focus_areas.length > 0) {
        text += "\nFocus Areas:\n";
        for (const fa of stage.focus_areas) {
          text += `  - ${fa.name} (weight: ${fa.weight}/4)\n`;
          if (fa.description) text += `    ${fa.description}\n`;
        }
      }

      if (stage.questions && stage.questions.length > 0) {
        text += "\nQuestions:\n";
        for (let i = 0; i < stage.questions.length; i++) {
          const q = stage.questions[i];
          text += `  ${i + 1}. ${q.question}\n`;
          if (q.purpose) text += `     Purpose: ${q.purpose}\n`;
        }
      }
    }

    text += `\n---\nRating Guide (1-4 scale)\n  1 = Does not meet expectations\n  2 = Partially meets expectations\n  3 = Meets expectations\n  4 = Exceeds expectations\n`;
    text += `\nRate each focus area from 1-4 based on the candidate's responses. Add specific pros and cons to support your ratings.`;

    return text;
  }

  // Generate editable reminder text
  function generateReminderText(collab: CollaboratorData): string {
    const name = collab.name || collab.email.split("@")[0];
    return `Hi ${name},\n\nThis is a friendly reminder to submit your interview feedback.\n\nTimely feedback helps the hiring team make better decisions. Please submit your ratings, pros, and cons at your earliest convenience.\n\nThank you!`;
  }

  /** Interpolate {{variable}} placeholders in a template string. */
  function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
  }

  /** Build template variables available on the client side. */
  function buildTemplateVars(collab: CollaboratorData): Record<string, string> {
    const collabStages = (!collab.assigned_stages || collab.assigned_stages.length === 0)
      ? stages
      : stages.filter((s) => collab.assigned_stages!.includes(s.id));

    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://app.axil.ie";
    const accessLink = collab.invite_token
      ? `${appUrl}/auth/collaborator?token=${collab.invite_token}`
      : `${appUrl}/playbooks/${playbookId}`;

    return {
      candidate_name: playbookTitle.split(" - ")[0] || playbookTitle,
      role_title: playbookTitle,
      stage_name: collabStages.map((s) => s.name).join(", "),
      interviewer_name: collab.name ?? collab.email,
      playbook_link: accessLink,
    };
  }

  async function fetchCmsTemplate(type: "prep" | "reminder"): Promise<{ subject: string; body_html: string } | null> {
    try {
      const res = await fetch(`/api/email-templates?type=${type}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data?.template ?? null;
    } catch {
      return null;
    }
  }

  async function openPrepModal(collab: CollaboratorData) {
    setPrepModal(collab);
    setPrepBody(""); // clear while loading
    setLoadingTemplate(true);

    const template = await fetchCmsTemplate("prep");
    if (template?.body_html) {
      const vars = buildTemplateVars(collab);
      setPrepBody(interpolate(template.body_html, vars));
    } else {
      setPrepBody(generatePrepText(collab));
    }
    setLoadingTemplate(false);
  }

  async function openReminderModal(collab: CollaboratorData) {
    setReminderModal(collab);
    setReminderBody(""); // clear while loading
    setLoadingTemplate(true);

    const template = await fetchCmsTemplate("reminder");
    if (template?.body_html) {
      const vars = buildTemplateVars(collab);
      setReminderBody(interpolate(template.body_html, vars));
    } else {
      setReminderBody(generateReminderText(collab));
    }
    setLoadingTemplate(false);
  }

  async function handleSendPrep() {
    if (!prepModal) return;
    setSendingPrep(true);
    try {
      const res = await fetch(`/api/collaborators/${prepModal.id}/send-prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbook_id: playbookId, custom_body: prepBody.trim() }),
      });

      if (handleSessionExpired(res)) return;
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to send prep email");
      }

      toast.success(`Prep email sent to ${prepModal.name || prepModal.email}`);
      setPrepModal(null);
    } catch (err) {
      console.error("[collaborators] Send prep failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to send prep email",
      );
    } finally {
      setSendingPrep(false);
    }
  }

  async function handleSendReminder() {
    if (!reminderModal) return;
    setSendingReminder(true);
    try {
      const res = await fetch(`/api/collaborators/${reminderModal.id}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbook_id: playbookId, custom_body: reminderBody.trim() }),
      });

      if (handleSessionExpired(res)) return;
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reminder");
      }

      toast.success(`Reminder sent to ${reminderModal.name || reminderModal.email}`);
      setReminderModal(null);
    } catch (err) {
      console.error("[collaborators] Send reminder failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to send reminder",
      );
    } finally {
      setSendingReminder(false);
    }
  }

  function StageCheckboxes({
    selected,
    onChange,
  }: {
    selected: string[];
    onChange: (stageId: string) => void;
  }) {
    if (stages.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {stages.map((stage) => {
          const checked = selected.includes(stage.id);
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onChange(stage.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors",
                checked
                  ? "border-teal-300 bg-teal-50 text-teal-800"
                  : "border-border/60 bg-muted/30 text-muted-foreground hover:border-teal-200 hover:bg-teal-50/50",
              )}
            >
              {stage.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite form */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        <h3 className="text-[15px] font-semibold tracking-tight mb-4">Invite Collaborator</h3>
        <div className="grid gap-3 grid-cols-3">
          <div>
            <Label htmlFor="collab-email" className="text-[12px] font-medium text-muted-foreground">
              Email
            </Label>
            <Input
              id="collab-email"
              type="email"
              placeholder="interviewer@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 text-[14px]"
            />
          </div>
          <div>
            <Label htmlFor="collab-name" className="text-[12px] font-medium text-muted-foreground">
              Name (optional)
            </Label>
            <Input
              id="collab-name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 text-[14px]"
            />
          </div>
          <div>
            <Label htmlFor="collab-role" className="text-[12px] font-medium text-muted-foreground">
              Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="collab-role" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interviewer">Interviewer</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stage assignment picker */}
        {stages.length > 0 && (
          <div className="mt-4">
            <Label className="text-[12px] font-medium text-muted-foreground mb-2 block">
              Assign to stages {selectedStages.length === 0 && <span className="text-muted-foreground/60">(all stages if none selected)</span>}
            </Label>
            <StageCheckboxes
              selected={selectedStages}
              onChange={(id) => toggleStage(id, selectedStages, setSelectedStages)}
            />
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleInvite}
            disabled={isInviting || !email.trim()}
          >
            {isInviting ? (
              <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
            ) : (
              <EnvelopeSimple size={16} weight="duotone" className="mr-2" />
            )}
            Send Invite
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkInvite(true)}
          >
            <UserPlus size={16} weight="duotone" className="mr-2" />
            Bulk Invite
          </Button>
        </div>
      </div>

      {/* Collaborator list */}
      {collaborators.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-12">
          <UsersThree size={20} weight="duotone" className="text-muted-foreground/40" />
          <p className="mt-2 text-[14px] text-muted-foreground">
            No collaborators invited yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {collaborators.map((collab) => (
            <div
              key={collab.id}
              className="rounded-xl border border-border/40 bg-card px-5 py-3.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-foreground truncate">
                      {collab.name || collab.email}
                    </p>
                    {collab.name && (
                      <p className="text-[12px] text-muted-foreground truncate">
                        {collab.email}
                      </p>
                    )}
                  </div>
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                    {collab.role ?? "interviewer"}
                  </span>
                  {collab.accepted_at ? (
                    <span className="flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-800 shrink-0">
                      <CheckCircle size={12} weight="duotone" />
                      Accepted
                    </span>
                  ) : (
                    <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                      Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openPrepModal(collab)}
                    className="rounded-lg p-2 text-teal-600 hover:bg-teal-50 transition-colors"
                    aria-label={`Send interview prep email to ${collab.name || collab.email}`}
                    title="Send interview prep email"
                  >
                    <EnvelopeSimple size={14} weight="duotone" />
                  </button>
                  <button
                    onClick={() => openReminderModal(collab)}
                    className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 transition-colors"
                    aria-label={`Send feedback reminder to ${collab.name || collab.email}`}
                    title="Send feedback reminder"
                  >
                    <BellRinging size={14} weight="duotone" />
                  </button>
                  <button
                    onClick={() => startEditAssignment(collab)}
                    className="rounded-lg p-2 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Edit stage assignments"
                    title="Edit stages"
                  >
                    <PencilSimple size={14} />
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRevoke(collab.id)}
                    aria-label={`Revoke invite for ${collab.name || collab.email}`}
                  >
                    <Trash size={14} weight="duotone" />
                  </Button>
                </div>
              </div>

              {/* Stage badges / edit */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {editingId === collab.id ? (
                  <div className="w-full space-y-2">
                    <StageCheckboxes
                      selected={editStages}
                      onChange={(id) => toggleStage(id, editStages, setEditStages)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => setEditingId(null)}
                      >
                        <X size={14} className="mr-1" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7"
                        onClick={() => saveAssignment(collab.id)}
                        disabled={isSavingAssignment}
                      >
                        {isSavingAssignment ? (
                          <CircleNotch size={14} weight="bold" className="mr-1 animate-spin" />
                        ) : (
                          <Check size={14} className="mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(!collab.assigned_stages || collab.assigned_stages.length === 0) ? (
                      <span className="text-[12px] text-muted-foreground">All stages</span>
                    ) : (
                      collab.assigned_stages.map((sid) => {
                        const stage = stages.find((s) => s.id === sid);
                        return (
                          <span
                            key={sid}
                            className="rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800"
                          >
                            {stage?.name ?? sid.slice(0, 8)}
                          </span>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prep email modal — fully editable */}
      <Dialog open={!!prepModal} onOpenChange={(open) => { if (!open) setPrepModal(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <EnvelopeSimple size={20} weight="duotone" className="text-teal-600" />
              Interview Prep Email
            </DialogTitle>
          </DialogHeader>

          {prepModal && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">{prepModal.email}</span>
                {prepModal.name && (
                  <span className="text-muted-foreground">({prepModal.name})</span>
                )}
              </div>

              <div>
                <Label htmlFor="prep-body" className="text-[13px] font-medium text-foreground mb-2 block">
                  Email content — edit freely before sending
                </Label>
                {loadingTemplate ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <CircleNotch size={16} weight="bold" className="animate-spin" />
                    Loading template...
                  </div>
                ) : (
                  <textarea
                    id="prep-body"
                    value={prepBody}
                    onChange={(e) => setPrepBody(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-[13px] leading-relaxed font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 resize-y"
                    rows={20}
                  />
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setPrepModal(null)} disabled={sendingPrep}>
              Cancel
            </Button>
            <Button onClick={handleSendPrep} disabled={sendingPrep || !prepBody.trim()}>
              {sendingPrep ? (
                <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
              ) : (
                <PaperPlaneTilt size={16} weight="duotone" className="mr-2" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk invite dialog */}
      <Dialog open={showBulkInvite} onOpenChange={(open) => { if (!open) setShowBulkInvite(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus size={20} weight="duotone" className="text-teal-600" />
              Bulk Invite Collaborators
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-emails" className="text-[13px] font-medium text-foreground mb-2 block">
                Email addresses — one per line, or separated by commas
              </Label>
              <textarea
                id="bulk-emails"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder={"jane@company.com\njohn@company.com\nkate@company.com"}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-[13px] leading-relaxed font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 resize-y"
                rows={6}
              />
              {bulkEmails.trim() && (
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  {parseBulkEmails(bulkEmails).length} valid email{parseBulkEmails(bulkEmails).length !== 1 ? "s" : ""} found
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="bulk-role" className="text-[12px] font-medium text-muted-foreground">
                Role for all
              </Label>
              <Select value={bulkRole} onValueChange={setBulkRole}>
                <SelectTrigger id="bulk-role" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interviewer">Interviewer</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {stages.length > 0 && (
              <div>
                <Label className="text-[12px] font-medium text-muted-foreground mb-2 block">
                  Assign all to stages {bulkStages.length === 0 && <span className="text-muted-foreground/60">(all stages if none selected)</span>}
                </Label>
                <StageCheckboxes
                  selected={bulkStages}
                  onChange={(id) => toggleStage(id, bulkStages, setBulkStages)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowBulkInvite(false)} disabled={isBulkInviting}>
              Cancel
            </Button>
            <Button onClick={handleBulkInvite} disabled={isBulkInviting || !bulkEmails.trim()}>
              {isBulkInviting ? (
                <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
              ) : (
                <UserPlus size={16} weight="duotone" className="mr-2" />
              )}
              Invite All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder email modal — fully editable */}
      <Dialog open={!!reminderModal} onOpenChange={(open) => { if (!open) setReminderModal(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BellRinging size={20} weight="duotone" className="text-amber-600" />
              Feedback Reminder
            </DialogTitle>
          </DialogHeader>

          {reminderModal && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">{reminderModal.email}</span>
                {reminderModal.name && (
                  <span className="text-muted-foreground">({reminderModal.name})</span>
                )}
              </div>

              <div>
                <Label htmlFor="reminder-body" className="text-[13px] font-medium text-foreground mb-2 block">
                  Email content — edit freely before sending
                </Label>
                {loadingTemplate ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <CircleNotch size={16} weight="bold" className="animate-spin" />
                    Loading template...
                  </div>
                ) : (
                  <textarea
                    id="reminder-body"
                    value={reminderBody}
                    onChange={(e) => setReminderBody(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-[13px] leading-relaxed font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 resize-y"
                    rows={10}
                  />
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setReminderModal(null)} disabled={sendingReminder}>
              Cancel
            </Button>
            <Button onClick={handleSendReminder} disabled={sendingReminder || !reminderBody.trim()}>
              {sendingReminder ? (
                <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
              ) : (
                <PaperPlaneTilt size={16} weight="duotone" className="mr-2" />
              )}
              Send Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
