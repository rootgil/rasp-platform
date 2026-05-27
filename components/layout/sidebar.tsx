"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Boxes,
  Server,
  ShieldAlert,
  Bell,
  Webhook,
  ScrollText,
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-[260px] bg-white border-r border-border flex flex-col z-50 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-5 border-b border-border">
          <Image src="/logo.png" alt="queno" width={110} height={32} className="object-contain" style={{ width: "auto" }} />
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
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-light text-brand"
                        : "text-text-secondary hover:bg-background hover:text-text-primary"
                    )}
                  >
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className={isActive ? "text-brand" : "text-text-muted"}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
