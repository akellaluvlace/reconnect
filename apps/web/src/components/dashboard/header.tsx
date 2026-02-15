"use client";

import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/playbooks": "Playbooks",
  "/candidates": "Candidates",
  "/team": "Team",
  "/settings": "Settings",
};

function getPageTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/playbooks/new")) return "New Playbook";
  if (pathname.startsWith("/playbooks/")) return "Playbook";
  if (pathname.startsWith("/candidates/")) return "Candidate";
  if (pathname.startsWith("/settings/")) return "Settings";
  return "Dashboard";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const title = getPageTitle(pathname);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md p-1 hover:bg-muted">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
