"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  UserPlus,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignOut } from "@/lib/hooks/use-sign-out";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const primaryNav = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Playbooks", href: "/playbooks", icon: BookOpen },
  { name: "Candidates", href: "/candidates", icon: Users },
  { name: "Team", href: "/team", icon: UserPlus },
];

const utilityNav = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const handleSignOut = useSignOut();
  const user = useAuthStore((s) => s.user);
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";
  const displayName = user?.email?.split("@")[0] ?? "User";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-border/60 bg-[#fafafa]">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
          <span className="text-sm font-bold text-white">A</span>
        </div>
        <span className="font-display text-[17px] font-semibold tracking-tight text-foreground">
          Axil
        </span>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 px-3 pt-2">
        <div className="space-y-0.5">
          {primaryNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-500 hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                    active
                      ? "text-teal-600"
                      : "text-slate-400 group-hover:text-slate-600",
                  )}
                  strokeWidth={active ? 2 : 1.75}
                />
                {item.name}
                {active && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-teal-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Utility nav + user */}
      <div className="px-3 pb-4">
        <div className="space-y-0.5">
          {utilityNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-500 hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600",
                  )}
                  strokeWidth={active ? 2 : 1.75}
                />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-3 h-px bg-border/60" />

        {/* User section */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-teal-100 text-[11px] font-semibold text-teal-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.email ?? ""}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
