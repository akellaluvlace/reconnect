"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const chapters = [
  { id: "discovery", name: "Discovery" },
  { id: "process", name: "Process" },
  { id: "alignment", name: "Alignment" },
  { id: "debrief", name: "Debrief" },
];

export function ChapterNav({ playbookId }: { playbookId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 items-center rounded-lg border border-border/60 bg-muted/40 p-1">
      {chapters.map((chapter) => {
        const href = `/playbooks/${playbookId}/${chapter.id}`;
        const isActive = pathname === href;

        return (
          <Link
            key={chapter.id}
            href={href}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {chapter.name}
          </Link>
        );
      })}
    </nav>
  );
}
