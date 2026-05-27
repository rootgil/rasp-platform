"use client";

import { Bell, Search, ChevronDown, LogOut, User, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function Topbar() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? session?.user?.email ?? "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="fixed top-0 left-[260px] right-0 h-16 bg-white border-b border-border flex items-center justify-between px-6 z-30">
      {/* Search */}
      <div className="relative max-w-sm w-full">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Search events, agents, endpoints..."
          className="w-full h-9 pl-9 pr-4 text-sm rounded-md border border-border bg-background text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Environment selector */}
        <div className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-sm font-medium text-text-secondary bg-background cursor-pointer hover:bg-white transition-colors">
          <span className="h-2 w-2 rounded-full bg-success" />
          Production
          <ChevronDown size={14} className="text-text-muted" />
        </div>

        {/* Notifications */}
        <button className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-border-light transition-colors">
          <Bell size={18} className="text-text-secondary" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-critical" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 px-2 rounded-md hover:bg-border-light transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-xs font-semibold">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-text-primary max-w-[120px] truncate">
                {name}
              </span>
              <ChevronDown size={14} className="text-text-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{session?.user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <User size={14} className="mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <Settings size={14} className="mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-critical focus:text-critical cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} className="mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
