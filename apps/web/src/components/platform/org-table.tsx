"use client";

import { PencilSimple, Check, Pause, Clock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface OrgRow {
  id: string;
  name: string;
  status: string;
  user_count: number;
  created_at: string;
}

interface OrgTableProps {
  orgs: OrgRow[];
  onEdit: (org: OrgRow) => void;
  onStatusChange: (orgId: string, newStatus: string) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Check }> = {
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700",
    icon: Check,
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  suspended: {
    label: "Suspended",
    className: "bg-red-100 text-red-700",
    icon: Pause,
  },
};

export function OrgTable({ orgs, onEdit, onStatusChange }: OrgTableProps) {
  if (orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 py-16">
        <p className="text-[13px] text-muted-foreground">
          No organisations yet
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[140px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orgs.map((org) => {
            const config = STATUS_CONFIG[org.status] ?? STATUS_CONFIG.pending;
            const Icon = config.icon;
            return (
              <TableRow key={org.id}>
                <TableCell className="pl-4 font-medium">{org.name}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      config.className,
                    )}
                  >
                    <Icon size={12} weight="bold" />
                    {config.label}
                  </span>
                </TableCell>
                <TableCell>{org.user_count}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(org.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {org.status !== "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStatusChange(org.id, "active")}
                        className="h-7 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        Activate
                      </Button>
                    )}
                    {org.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStatusChange(org.id, "suspended")}
                        className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Suspend
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(org)}
                      className="h-8 w-8 p-0"
                    >
                      <PencilSimple size={16} weight="duotone" />
                      <span className="sr-only">Edit {org.name}</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
