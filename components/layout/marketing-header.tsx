"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-[#e2e8f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Queno" className="h-16 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-[#2563eb] bg-[#eff6ff]"
                    : "text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#475569] hover:text-[#0f172a]">
              Sign in
            </Link>
            <Button size="sm" asChild>
              <Link href="/contact">Book a demo</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden rounded-[8px] p-2 text-[#475569]"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#e2e8f0] py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-[8px] text-sm font-medium text-[#475569] hover:bg-[#f8fafc]"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 flex gap-2">
              <Link href="/login" className="flex-1 text-center px-3 py-2 border border-[#e2e8f0] rounded-[8px] text-sm font-medium">Sign in</Link>
              <Link href="/contact" className="flex-1 text-center px-3 py-2 bg-[#2563eb] text-white rounded-[8px] text-sm font-medium">Book demo</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
