"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Building2,
  Users,
  Activity,
  HeartPulse,
  FileSearch,
  Inbox,
  Shield,
  ShieldAlert,
  KeyRound,
  LogOut,
  Menu,
  UserCircle,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const navGroups = [
  {
    title: null,
    items: [
      { href: "/backoffice", label: "Platform Overview", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Customers",
    items: [
      { href: "/backoffice/organizations", label: "Organizations", icon: Building2 },
      { href: "/backoffice/customers", label: "Customers", icon: Users },
      { href: "/backoffice/contact-leads", label: "Contact Leads", icon: Inbox },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/backoffice/rules", label: "Detection Rules", icon: Shield },
      { href: "/backoffice/agent-versions", label: "Agent Versions", icon: Activity },
      { href: "/backoffice/security-center", label: "Security Center", icon: ShieldAlert },
      { href: "/backoffice/crypto", label: "Crypto Keys", icon: KeyRound },
    ],
  },
  {
    title: "Observability",
    items: [
      { href: "/backoffice/system-health", label: "System Health", icon: HeartPulse },
      { href: "/backoffice/platform-audit", label: "Platform Audit", icon: FileSearch },
    ],
  },
];

interface AdminSidebarProps {
  adminEmail?: string;
}

function AdminNotifBadge() {
  const [count, setCount]   = useState(0);
  const router              = useRouter();

  const fetchCount = useCallback(async () => {
    try {
      const res  = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount: number };
      setCount(data.unreadCount);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  async function handleClick() {
    // Mark all as read then navigate
    await fetch("/api/admin/notifications", { method: "POST" }).catch(() => {});
    setCount(0);
    router.push("/backoffice/security-center");
  }

  if (count === 0) return null;

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm text-yellow-300 hover:bg-white/10 hover:text-yellow-200 transition-colors"
    >
      <Bell size={16} />
      <span className="flex-1 text-left">{count} pending approval{count > 1 ? "s" : ""}</span>
      <span className="h-5 min-w-[20px] rounded-full bg-yellow-400 text-[10px] font-bold text-black flex items-center justify-center px-1">
        {count > 9 ? "9+" : count}
      </span>
    </button>
  );
}

export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-text-primary flex items-center px-4 z-40 border-b border-white/10">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-white/10 transition-colors mr-3 shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-white" />
        </button>
        <Image
          src="/logo.png"
          alt="RASP Admin"
          width={100}
          height={28}
          className="object-contain brightness-0 invert"
          style={{ width: "auto" }}
        />
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-[260px] bg-text-primary flex flex-col z-50 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-5 border-b border-white/10">
          <Image
            src="/logo.png"
            alt="RASP Admin"
            width={110}
            height={32}
            className="object-contain brightness-0 invert"
            style={{ width: "auto" }}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.title && (
                <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-white/30">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const exact = (item as { exact?: boolean }).exact;
                  // Project detail lives under /backoffice/projects but is reached
                  // from Organizations — keep that nav item highlighted.
                  const isActive = exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href) ||
                      (item.href === "/backoffice/organizations" &&
                        pathname.startsWith("/backoffice/projects"));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-brand text-white"
                            : "text-text-muted hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon size={18} strokeWidth={2} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-1">
          {adminEmail && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <UserCircle size={15} className="text-white/40 shrink-0" />
              <span className="text-xs text-white/50 truncate">{adminEmail}</span>
            </div>
          )}
          <AdminNotifBadge />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm text-text-muted hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
