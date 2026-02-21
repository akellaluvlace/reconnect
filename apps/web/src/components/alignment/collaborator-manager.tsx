"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Collaborators
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite form */}
        <div className="rounded-md border p-4 space-y-3">
          <p className="text-sm font-medium">Invite Collaborator</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="collab-email" className="text-xs">
                Email
              </Label>
              <Input
                id="collab-email"
                type="email"
                placeholder="interviewer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="collab-name" className="text-xs">
                Name (optional)
              </Label>
              <Input
                id="collab-name"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="collab-role" className="text-xs">
                Role
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="collab-role">
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
          <p className="text-sm text-muted-foreground">
            No collaborators invited yet.
          </p>
        ) : (
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {collab.name || collab.email}
                    </p>
                    {collab.name && (
                      <p className="text-xs text-muted-foreground">
                        {collab.email}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {collab.role ?? "interviewer"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getStageNames(collab.assigned_stages)}
                  </span>
                  {collab.accepted_at ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Accepted
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(collab.id)}
                  aria-label={`Revoke invite for ${collab.name || collab.email}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
