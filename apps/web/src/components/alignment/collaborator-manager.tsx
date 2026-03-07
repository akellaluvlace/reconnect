"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import { cn } from "@/lib/utils";
import type { StageInfo, CollaboratorData } from "./alignment-page-client";

interface CollaboratorManagerProps {
  playbookId: string;
  collaborators: CollaboratorData[];
  stages: StageInfo[];
  onUpdate: (collaborators: CollaboratorData[]) => void;
}

export function CollaboratorManager({
  playbookId,
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

  // Send prep email
  const [sendingPrep, setSendingPrep] = useState<string | null>(null);

  // Send reminder email
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

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

  async function handleSendPrep(collaboratorId: string) {
    setSendingPrep(collaboratorId);
    try {
      const res = await fetch(`/api/collaborators/${collaboratorId}/send-prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbook_id: playbookId }),
      });

      if (handleSessionExpired(res)) return;
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to send prep email");
      }

      toast.success("Prep email sent");
    } catch (err) {
      console.error("[collaborators] Send prep failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to send prep email",
      );
    } finally {
      setSendingPrep(null);
    }
  }

  async function handleSendReminder(collaboratorId: string) {
    setSendingReminder(collaboratorId);
    try {
      const res = await fetch(`/api/collaborators/${collaboratorId}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbook_id: playbookId }),
      });

      if (handleSessionExpired(res)) return;
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reminder");
      }

      toast.success("Reminder sent");
    } catch (err) {
      console.error("[collaborators] Send reminder failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to send reminder",
      );
    } finally {
      setSendingReminder(null);
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

        <Button
          size="sm"
          className="mt-4"
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
                    onClick={() => handleSendPrep(collab.id)}
                    disabled={sendingPrep === collab.id}
                    className="rounded-lg p-2 text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-50"
                    aria-label={`Send interview prep email to ${collab.name || collab.email}`}
                    title="Send interview prep email"
                  >
                    {sendingPrep === collab.id ? (
                      <CircleNotch size={14} weight="bold" className="animate-spin" />
                    ) : (
                      <EnvelopeSimple size={14} weight="duotone" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSendReminder(collab.id)}
                    disabled={sendingReminder === collab.id}
                    className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    aria-label={`Send feedback reminder to ${collab.name || collab.email}`}
                    title="Send feedback reminder"
                  >
                    {sendingReminder === collab.id ? (
                      <CircleNotch size={14} weight="bold" className="animate-spin" />
                    ) : (
                      <BellRinging size={14} weight="duotone" />
                    )}
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
    </div>
  );
}
