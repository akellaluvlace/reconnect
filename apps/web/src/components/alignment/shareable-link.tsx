"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LinkSimple,
  Copy,
  Trash,
  CircleNotch,
  ArrowSquareOut,
  Eye,
  EyeSlash,
  ShieldCheck,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

interface ShareLinkData {
  id: string;
  token: string;
  is_active: boolean | null;
  expires_at: string | null;
  view_count: number | null;
  created_at: string | null;
}

interface ShareableLinkProps {
  playbookId: string;
  shareLinks: ShareLinkData[];
  onUpdate: (links: ShareLinkData[]) => void;
}

export function ShareableLink({
  playbookId,
  shareLinks,
  onUpdate,
}: ShareableLinkProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  async function handleCreate() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbook_id: playbookId }),
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create share link");
      }

      const { data } = await res.json();
      onUpdate([data, ...shareLinks]);
      toast.success("Share link created");
    } catch (err) {
      console.error("[share-links] Create failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create link",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/share-links/${id}`, {
        method: "DELETE",
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to revoke link");
      }

      onUpdate(shareLinks.filter((l) => l.id !== id));
      toast.success("Share link revoked");
    } catch (err) {
      console.error("[share-links] Revoke failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke link",
      );
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy link"),
    );
  }

  function isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
          ) : (
            <LinkSimple size={16} weight="duotone" className="mr-2" />
          )}
          Generate Link
        </Button>
      </div>

      {shareLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-12">
          <LinkSimple size={20} weight="duotone" className="text-muted-foreground/40" />
          <p className="mt-2 text-[14px] text-muted-foreground">
            No share links created yet. Generate a link to share limited
            hiring plan information with external collaborators.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shareLinks.map((link) => {
            const expired = isExpired(link.expires_at);
            const showingPreview = previewId === link.id;
            return (
              <div
                key={link.id}
                className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <ArrowSquareOut size={16} weight="duotone" className="text-muted-foreground" />
                    <div>
                      <p className="text-[13px] font-mono text-foreground">
                        /share/{link.token.slice(0, 8)}...
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {link.expires_at && (
                          <span>
                            {expired ? "Expired" : `Expires ${new Date(link.expires_at).toLocaleDateString()}`}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Eye size={12} weight="duotone" />
                          {link.view_count ?? 0} views
                        </span>
                      </div>
                    </div>
                    {expired ? (
                      <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-800">
                        Expired
                      </span>
                    ) : (
                      <span className="rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-800">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-teal-600"
                      onClick={() => setPreviewId(showingPreview ? null : link.id)}
                      aria-label="Preview link"
                      title="Preview what recipient sees"
                    >
                      {showingPreview ? (
                        <EyeSlash size={14} weight="duotone" />
                      ) : (
                        <Eye size={14} weight="duotone" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => copyLink(link.token)}
                      aria-label="Copy link"
                    >
                      <Copy size={14} weight="duotone" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRevoke(link.id)}
                      aria-label="Revoke link"
                    >
                      <Trash size={14} weight="duotone" />
                    </Button>
                  </div>
                </div>

                {/* Preview panel */}
                {showingPreview && (
                  <div className="border-t border-border/30 px-5 py-4 bg-muted/10 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="rounded-lg border border-teal-200 bg-gradient-to-b from-teal-50/40 to-white p-5 space-y-3">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-teal-700">
                        What the recipient sees
                      </p>

                      <div className="space-y-3 text-[13px]">
                        <div className="flex items-start gap-2">
                          <ShieldCheck size={14} weight="duotone" className="mt-0.5 text-teal-500 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Candidate first name + role</p>
                            <p className="text-[12px] text-muted-foreground">Basic candidate info only</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <ShieldCheck size={14} weight="duotone" className="mt-0.5 text-teal-500 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Their assigned stage</p>
                            <p className="text-[12px] text-muted-foreground">Focus areas and interview questions</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <ShieldCheck size={14} weight="duotone" className="mt-0.5 text-teal-500 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Feedback form</p>
                            <p className="text-[12px] text-muted-foreground">Rating categories (1-4), pros, cons, focus area confirmation</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/20 text-[12px] text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground">Not visible to recipient:</p>
                          <p>Other feedback, salary data, CV, AI synthesis, full hiring plan, or scores</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
