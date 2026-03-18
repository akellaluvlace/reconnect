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
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

interface AddCandidateDialogProps {
  playbookId: string;
  onAdded: (candidate: { id: string; name: string; email: string | null; status: string | null; current_stage_id: string | null; playbook_id: string | null; created_at: string | null }) => void;
  trigger?: React.ReactNode;
}

export function AddCandidateDialog({ playbookId, onAdded, trigger }: AddCandidateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          playbook_id: playbookId,
        }),
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add candidate");
      }

      const { data } = await res.json();
      onAdded({
        id: data.id,
        name: data.name,
        email: data.email,
        status: data.status,
        current_stage_id: null,
        playbook_id: data.playbook_id,
        created_at: data.created_at,
      });
      toast.success(`${data.name} added`);
      setName("");
      setEmail("");
      setOpen(false);
    } catch (err) {
      console.error("[add-candidate]", err);
      toast.error(err instanceof Error ? err.message : "Failed to add candidate");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setName("");
        setEmail("");
      }
    }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
            <UserPlus size={14} weight="bold" className="mr-1.5" />
            Add Candidate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="candidate-name">Name *</Label>
            <Input
              id="candidate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="candidate-email">Email</Label>
            <Input
              id="candidate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isSubmitting ? (
                <CircleNotch size={14} weight="bold" className="mr-1.5 animate-spin" />
              ) : (
                <UserPlus size={14} weight="bold" className="mr-1.5" />
              )}
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
