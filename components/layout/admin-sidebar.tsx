"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Building2,
  Users,
  Activity,
  HeartPulse,
  FileSearch,
  LogOut,
  Menu,
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
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
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
