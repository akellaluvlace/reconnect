"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MagnifyingGlass,
  ListChecks,
  Target,
  ChatCircleDots,
  Lock,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const chapters = [
  { id: "discovery", name: "Discovery", icon: MagnifyingGlass, enabled: true },
  { id: "process", name: "Process", icon: ListChecks, enabled: false },
  { id: "alignment", name: "Alignment", icon: Target, enabled: false },
  { id: "debrief", name: "Debrief", icon: ChatCircleDots, enabled: false },
];

export function ChapterNav({ playbookId }: { playbookId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 items-center rounded-lg border border-border/60 bg-muted/40 p-1">
      {chapters.map((chapter) => {
        const href = `/playbooks/${playbookId}/${chapter.id}`;
        const isActive = pathname === href;
        const Icon = chapter.icon;

        if (!chapter.enabled) {
          return (
            <span
              key={chapter.id}
              className="flex cursor-not-allowed items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground/50"
              title="Coming soon"
            >
              <Icon size={16} className="opacity-40" />
              {chapter.name}
              <Lock size={12} className="opacity-40" />
            </span>
          );
        }

        return (
          <Link
            key={chapter.id}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon
              size={16}
              weight={isActive ? "duotone" : "regular"}
              className={isActive ? "text-teal-600" : ""}
            />
            {chapter.name}
          </Link>
        );
      })}
    </nav>
  );
}
