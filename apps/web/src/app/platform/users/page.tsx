"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MagnifyingGlass, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import { UserTable } from "@/components/platform/user-table";
import type { UserRow } from "@/components/platform/user-table";

interface OrgOption {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgNames, setOrgNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all");

  // Debounce search using ref + setTimeout
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearch(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setDebouncedSearch(value);
      }, 300);
    },
    [],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/orgs");
      if (handleSessionExpired(res)) return;
      if (!res.ok) return;
      const data: (OrgOption & { user_count?: number; created_at?: string })[] =
        await res.json();
      setOrgs(data.map((o) => ({ id: o.id, name: o.name })));
      const map = new Map<string, string>();
      for (const o of data) {
        map.set(o.id, o.name);
      }
      setOrgNames(map);
    } catch (err) {
      console.error("[platform/users] Org list fetch error:", err);
    }
  }, []);

  const fetchUsers = useCallback(
    async (searchTerm: string, orgId: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (orgId && orgId !== "all") {
          params.set("org_id", orgId);
        }
        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }
        const url = `/api/platform/users${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url);
        if (handleSessionExpired(res)) return;
        if (!res.ok) {
          toast.error("Failed to load users");
          return;
        }
        const data: UserRow[] = await res.json();
        setUsers(data);
      } catch {
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial load: fetch orgs once
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetchOrgs();
  }, [fetchOrgs]);

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers(debouncedSearch, selectedOrgId);
  }, [debouncedSearch, selectedOrgId, fetchUsers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="View all users across the platform"
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <MagnifyingGlass
            size={16}
            weight="duotone"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All organisations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organisations</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <CircleNotch
            size={24}
            weight="bold"
            className="animate-spin text-teal-600"
          />
        </div>
      ) : (
        <UserTable users={users} orgNames={orgNames} />
      )}
    </div>
  );
}
