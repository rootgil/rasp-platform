"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Activity,
  HeartPulse,
  FileSearch,
  Shield,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/backoffice", label: "Platform Overview", icon: LayoutDashboard, exact: true },
  { href: "/backoffice/organizations", label: "Organizations", icon: Building2 },
  { href: "/backoffice/customers", label: "Customers", icon: Users },
  { href: "/backoffice/agent-versions", label: "Agent Versions", icon: Activity },
  { href: "/backoffice/system-health", label: "System Health", icon: HeartPulse },
  { href: "/backoffice/platform-audit", label: "Platform Audit", icon: FileSearch },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#0f172a] flex flex-col z-40">
      {/* Logo */}
      <div className="flex h-16 items-center px-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#2563eb]">
            <Shield size={16} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-sm font-bold text-white">RASP</span>
            <span className="ml-1.5 text-xs font-medium text-[#94a3b8] bg-[#1e293b] px-1.5 py-0.5 rounded">Admin</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#2563eb] text-white"
                      : "text-[#94a3b8] hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={18} strokeWidth={2} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-[8px] text-sm text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
