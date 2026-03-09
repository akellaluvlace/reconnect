"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/ui/page-header";
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
import { Plus, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import { StatsCards } from "@/components/platform/stats-cards";
import { OrgTable } from "@/components/platform/org-table";
import type { OrgRow } from "@/components/platform/org-table";

interface Stats {
  total_orgs: number;
  total_users: number;
  total_playbooks: number;
}

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_orgs: 0,
    total_users: 0,
    total_playbooks: 0,
  });
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgRow | null>(null);
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/orgs");
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        toast.error("Failed to load organisations");
        return;
      }
      const data: OrgRow[] = await res.json();
      setOrgs(data);
    } catch {
      toast.error("Failed to load organisations");
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/stats");
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        console.error("[platform/orgs] Stats fetch failed:", res.status);
        return;
      }
      const data: Stats = await res.json();
      setStats(data);
    } catch (err) {
      console.error("[platform/orgs] Stats fetch error:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOrgs(), fetchStats()]);
    setLoading(false);
  }, [fetchOrgs, fetchStats]);

  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadData();
  }, [loadData]);

  async function handleStatusChange(orgId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(
          (err as { error?: string } | null)?.error ??
            "Failed to update status",
        );
        return;
      }
      toast.success(`Organisation ${newStatus === "active" ? "activated" : "suspended"}`);
      await loadData();
    } catch {
      toast.error("Failed to update status");
    }
  }

  function openCreate() {
    setEditingOrg(null);
    setOrgName("");
    setDialogOpen(true);
  }

  function openEdit(org: OrgRow) {
    setEditingOrg(org);
    setOrgName(org.name);
    setDialogOpen(true);
  }

  async function handleSave() {
    const trimmed = orgName.trim();
    if (!trimmed) {
      toast.error("Organisation name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingOrg) {
        // Update
        const res = await fetch(`/api/platform/orgs/${editingOrg.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (handleSessionExpired(res)) return;
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          toast.error(
            (err as { error?: string } | null)?.error ??
              "Failed to update organisation",
          );
          return;
        }
        toast.success("Organisation updated");
      } else {
        // Create
        const res = await fetch("/api/platform/orgs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (handleSessionExpired(res)) return;
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          toast.error(
            (err as { error?: string } | null)?.error ??
              "Failed to create organisation",
          );
          return;
        }
        toast.success("Organisation created");
      }

      setDialogOpen(false);
      await loadData();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations"
        description="Manage all organisations on the platform"
        actions={
          <Button onClick={openCreate} className="gap-1.5">
            <Plus size={16} weight="bold" />
            Create Organisation
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <CircleNotch
            size={24}
            weight="bold"
            className="animate-spin text-teal-600"
          />
        </div>
      ) : (
        <>
          <StatsCards
            totalOrgs={stats.total_orgs}
            totalUsers={stats.total_users}
            totalPlaybooks={stats.total_playbooks}
          />
          <OrgTable orgs={orgs} onEdit={openEdit} onStatusChange={handleStatusChange} />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOrg ? "Edit Organisation" : "Create Organisation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-name" className="text-[13px]">
                Name
              </Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organisation name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !saving) {
                    handleSave();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && (
                <CircleNotch
                  size={16}
                  weight="bold"
                  className="mr-1.5 animate-spin"
                />
              )}
              {editingOrg ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
