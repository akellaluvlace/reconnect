"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Lightbulb,
  Factory,
  Stairs,
  Blueprint,
  ChatCircleText,
  FileText,
  EnvelopeSimple,
  ArrowLeft,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Skills", href: "/settings/admin/skills", icon: Lightbulb },
  { name: "Industries", href: "/settings/admin/industries", icon: Factory },
  { name: "Levels", href: "/settings/admin/levels", icon: Stairs },
  { name: "Stage Templates", href: "/settings/admin/templates", icon: Blueprint },
  { name: "Question Bank", href: "/settings/admin/questions", icon: ChatCircleText },
  { name: "JD Templates", href: "/settings/admin/jd-templates", icon: FileText },
  { name: "Email Templates", href: "/settings/admin/emails", icon: EnvelopeSimple },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-48 shrink-0">
      <Link
        href="/settings"
        className="mb-4 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} weight="bold" />
        Settings
      </Link>
      <nav className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-teal-50 text-teal-700"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon size={16} weight={active ? "duotone" : "regular"} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
