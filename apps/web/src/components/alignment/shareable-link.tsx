"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Link2,
  Copy,
  Trash2,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

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

  async function handleCreate() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbook_id: playbookId }),
      });

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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 h-4 w-4" />
          )}
          Generate Link
        </Button>
      </div>

      {shareLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-12">
          <Link2 className="h-5 w-5 text-muted-foreground/40" />
          <p className="mt-2 text-[14px] text-muted-foreground">
            No share links created yet. Generate a link to share limited
            playbook information with external collaborators.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shareLinks.map((link) => {
            const expired = isExpired(link.expires_at);
            return (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-xl border border-border/40 bg-card px-5 py-3.5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
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
                        <Eye className="h-3 w-3" />
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
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => copyLink(link.token)}
                    aria-label="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRevoke(link.id)}
                    aria-label="Revoke link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
