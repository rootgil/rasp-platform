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
    <header className="fixed top-0 left-[260px] right-0 h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-6 z-30">
      {/* Search */}
      <div className="relative max-w-sm w-full">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
        />
        <input
          type="text"
          placeholder="Search events, agents, endpoints..."
          className="w-full h-9 pl-9 pr-4 text-sm rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:bg-white"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Environment selector */}
        <div className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-[8px] border border-[#e2e8f0] text-sm font-medium text-[#475569] bg-[#f8fafc] cursor-pointer hover:bg-white transition-colors">
          <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
          Production
          <ChevronDown size={14} className="text-[#94a3b8]" />
        </div>

        {/* Notifications */}
        <button className="relative h-9 w-9 flex items-center justify-center rounded-[8px] hover:bg-[#f1f5f9] transition-colors">
          <Bell size={18} className="text-[#475569]" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#dc2626]" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 px-2 rounded-[8px] hover:bg-[#f1f5f9] transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563eb] text-white text-xs font-semibold">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-[#0f172a] max-w-[120px] truncate">
                {name}
              </span>
              <ChevronDown size={14} className="text-[#94a3b8]" />
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
              className="text-[#dc2626] focus:text-[#dc2626] cursor-pointer"
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
