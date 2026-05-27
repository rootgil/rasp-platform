"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Server,
  ShieldAlert,
  Bell,
  Webhook,
  ScrollText,
  Shield,
  KeyRound,
  FileSearch,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Applications", icon: Boxes },
  { href: "/dashboard/agents", label: "Agents", icon: Server },
  { href: "/dashboard/events", label: "Security Events", icon: ShieldAlert },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/api-discovery", label: "API Discovery", icon: Webhook },
  { href: "/dashboard/redaction-policies", label: "Redaction Logs", icon: ScrollText },
  { href: "/dashboard/agent-lifecycle", label: "Agent Lifecycle", icon: Activity },
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/audit-logs", label: "Audit Logs", icon: FileSearch },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-white border-r border-[#e2e8f0] flex flex-col z-40">
      {/* Logo */}
      <div className="flex h-16 items-center px-5 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#2563eb]">
            <Shield size={16} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-sm font-bold text-[#0f172a]">RASP</span>
            <span className="text-sm font-bold text-[#2563eb]"> Platform</span>
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
                      ? "bg-[#eff6ff] text-[#2563eb]"
                      : "text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={2}
                    className={isActive ? "text-[#2563eb]" : "text-[#94a3b8]"}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#e2e8f0]">
        <div className="rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] p-3">
          <p className="text-xs text-[#94a3b8] font-medium">Environment</p>
          <p className="text-xs font-semibold text-[#0f172a] mt-0.5">Production</p>
        </div>
      </div>
    </aside>
  );
}
