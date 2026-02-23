"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSignOut } from "@/lib/hooks/use-sign-out";
import { useAuthStore } from "@/stores/auth-store";

interface Crumb {
  label: string;
  href?: string;
}

function buildBreadcrumbs(pathname: string): Crumb[] {
  if (pathname === "/") return [{ label: "Dashboard" }];

  const crumbs: Crumb[] = [];

  if (pathname.startsWith("/playbooks")) {
    crumbs.push({ label: "Playbooks", href: "/playbooks" });

    if (pathname === "/playbooks/new") {
      crumbs.push({ label: "New Playbook" });
    } else if (pathname.match(/^\/playbooks\/[^/]+/)) {
      // Playbook detail — chapter pages
      const parts = pathname.split("/");
      const chapter = parts[3];
      if (chapter) {
        crumbs.push({ label: chapter.charAt(0).toUpperCase() + chapter.slice(1) });
      }
    }
  } else if (pathname.startsWith("/candidates")) {
    crumbs.push({ label: "Candidates" });
  } else if (pathname.startsWith("/team")) {
    crumbs.push({ label: "Team" });
  } else if (pathname.startsWith("/settings")) {
    crumbs.push({ label: "Settings", href: "/settings" });
    const sub = pathname.split("/")[2];
    if (sub) {
      crumbs.push({ label: sub.charAt(0).toUpperCase() + sub.slice(1) });
    }
  }

  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const handleSignOut = useSignOut();
  const crumbs = buildBreadcrumbs(pathname);
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-[13px]">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-foreground">
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-teal-100 text-[10px] font-semibold text-teal-700">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-[13px] font-medium">{user?.email?.split("@")[0]}</p>
            <p className="text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
