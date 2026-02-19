"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";

export interface PlaybookListItem {
  id: string;
  title: string;
  department: string | null;
  status: string | null;
  created_at: string | null;
}

export function PlaybookCard({ playbook }: { playbook: PlaybookListItem }) {
  let createdAt = "Unknown";
  if (playbook.created_at) {
    try {
      createdAt = formatDistanceToNow(new Date(playbook.created_at), {
        addSuffix: true,
      });
    } catch {
      createdAt = "Unknown";
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-2">
            {playbook.title}
          </CardTitle>
          <StatusBadge status={playbook.status} />
        </div>
      </CardHeader>
      <CardContent>
        {playbook.department && (
          <p className="text-sm text-muted-foreground truncate">{playbook.department}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Created {createdAt}
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/playbooks/${playbook.id}`}>View</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
