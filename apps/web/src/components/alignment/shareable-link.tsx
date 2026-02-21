"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share Links
          </CardTitle>
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
      </CardHeader>
      <CardContent>
        {shareLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No share links created yet. Generate a link to share limited
            playbook information with external collaborators.
          </p>
        ) : (
          <div className="space-y-2">
            {shareLinks.map((link) => {
              const expired = isExpired(link.expires_at);
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-mono">
                        /share/{link.token.slice(0, 8)}...
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                      <Badge variant="destructive" className="text-xs">
                        Expired
                      </Badge>
                    ) : (
                      <Badge
                        className="bg-green-100 text-green-800 hover:bg-green-100 text-xs"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(link.token)}
                      aria-label="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(link.id)}
                      aria-label="Revoke link"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
