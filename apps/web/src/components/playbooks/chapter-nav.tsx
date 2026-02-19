"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ListChecks, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const chapters = [
  { id: "discovery", name: "Discovery", icon: Search },
  { id: "process", name: "Process", icon: ListChecks },
  { id: "alignment", name: "Alignment", icon: Users },
  { id: "debrief", name: "Debrief", icon: MessageSquare },
];

export function ChapterNav({ playbookId }: { playbookId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1 border-b">
      {chapters.map((chapter) => {
        const href = `/playbooks/${playbookId}/${chapter.id}`;
        const isActive = pathname === href;

        return (
          <Link
            key={chapter.id}
            href={href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/25",
            )}
          >
            <chapter.icon className="h-4 w-4" />
            {chapter.name}
          </Link>
        );
      })}
    </nav>
  );
}
