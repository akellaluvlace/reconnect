"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignOut } from "@/lib/hooks/use-sign-out";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { name: "Dashboard", href: "/" },
  { name: "Playbooks", href: "/playbooks" },
  { name: "Candidates", href: "/candidates" },
  { name: "Team", href: "/team" },
];

export function TopNav() {
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
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center px-6">
        {/* Logo */}
        <Link href="/" className="mr-8 flex items-center gap-2.5 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-600">
            <span className="text-[11px] font-bold text-white">A</span>
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            Axil
          </span>
        </Link>

        {/* Nav items */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-all",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.name}
                {active && (
                  <span className="absolute inset-x-2 -bottom-[1px] h-[2px] rounded-full bg-foreground" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/settings"
            className={cn(
              "rounded-md p-2 transition-colors",
              isActive("/settings")
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-teal-100 text-[10px] font-semibold text-teal-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-[13px] font-medium">{displayName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
