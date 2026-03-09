"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  organization_id: string | null;
  created_at: string;
}

interface UserTableProps {
  users: UserRow[];
  orgNames: Map<string, string>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: string }) {
  const styles =
    role === "admin"
      ? "bg-purple-50 text-purple-700"
      : role === "manager"
        ? "bg-blue-50 text-blue-700"
        : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles}`}
    >
      {role}
    </span>
  );
}

export function UserTable({ users, orgNames }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 py-16">
        <p className="text-[13px] text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organisation</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="pl-4 font-medium">
                {user.name || "--"}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell className="text-muted-foreground">
                {user.organization_id
                  ? (orgNames.get(user.organization_id) ?? "Unknown")
                  : "--"}
              </TableCell>
              <TableCell>
                <RoleBadge role={user.role} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(user.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
