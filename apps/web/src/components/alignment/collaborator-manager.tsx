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
import { Users, Trash2, Loader2, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface StageInfo {
  id: string;
  name: string;
  type: string;
  duration_minutes: number;
  order_index: number;
}

interface CollaboratorData {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  assigned_stages: string[] | null;
  expires_at: string;
  accepted_at: string | null;
  invite_token: string | null;
  created_at: string | null;
}

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
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send invite");
      }

      const { collaborator } = await res.json();
      onUpdate([collaborator, ...collaborators]);
      setEmail("");
      setName("");
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

  function getStageNames(stageIds: string[] | null): string {
    if (!stageIds || stageIds.length === 0) return "All stages";
    return stageIds
      .map((sid) => stages.find((s) => s.id === sid)?.name ?? sid)
      .join(", ");
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
        <Button
          size="sm"
          className="mt-4"
          onClick={handleInvite}
          disabled={isInviting || !email.trim()}
        >
          {isInviting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Send Invite
        </Button>
      </div>

      {/* Collaborator list */}
      {collaborators.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-12">
          <Users className="h-5 w-5 text-muted-foreground/40" />
          <p className="mt-2 text-[14px] text-muted-foreground">
            No collaborators invited yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {collaborators.map((collab) => (
            <div
              key={collab.id}
              className="flex items-center justify-between rounded-xl border border-border/40 bg-card px-5 py-3.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    {collab.name || collab.email}
                  </p>
                  {collab.name && (
                    <p className="text-[12px] text-muted-foreground">
                      {collab.email}
                    </p>
                  )}
                </div>
                <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {collab.role ?? "interviewer"}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {getStageNames(collab.assigned_stages)}
                </span>
                {collab.accepted_at ? (
                  <span className="flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-800">
                    <CheckCircle className="h-3 w-3" />
                    Accepted
                  </span>
                ) : (
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Pending
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRevoke(collab.id)}
                aria-label={`Revoke invite for ${collab.name || collab.email}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
