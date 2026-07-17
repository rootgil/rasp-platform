"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Three illustrated panels for "Deploy in minutes".
 * Style matches LiveDashboard window chrome.
 */
export function HowItWorksPanels() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((n) => (n + 1) % 3), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid md:grid-cols-3 gap-4 md:gap-5">
      <InstallPanel active={active === 0} />
      <InspectPanel active={active === 1} />
      <ProtectPanel active={active === 2} />
    </div>
  );
}

function PanelChrome({
  title,
  step,
  active,
  children,
}: {
  title: string;
  step: number;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white overflow-hidden transition-all duration-300 ${
        active
          ? "border-brand/40 shadow-[0_8px_32px_rgba(37,99,235,0.12)]"
          : "border-border shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${
              active ? "bg-brand" : "bg-text-muted"
            }`}
          >
            {step}
          </span>
          <span className="text-xs font-semibold text-text-primary">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-critical/40" />
          <div className="h-2 w-2 rounded-full bg-medium/40" />
          <div className="h-2 w-2 rounded-full bg-success/40" />
        </div>
      </div>
      <div className="p-4 min-h-[168px]">{children}</div>
    </div>
  );
}

function InstallPanel({ active }: { active: boolean }) {
  return (
    <PanelChrome title="Install" step={1} active={active}>
      <p className="text-[11px] text-text-secondary mb-3 leading-relaxed">
        One package. No proxy, no sidecar, no infra change.
      </p>
      <div className="rounded-lg bg-text-primary px-3 py-2.5 font-mono text-[11px] leading-relaxed">
        <span className="text-text-muted">$ </span>
        <span className="text-[#93c5fd]">npm install @queno/agent-node</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        Works with Express, Fastify, NestJS
      </div>
    </PanelChrome>
  );
}

function InspectPanel({ active }: { active: boolean }) {
  const rows = [
    { method: "POST", path: "/api/auth/login", status: "OK" },
    { method: "GET", path: "/api/orders/94821", status: "WATCH" },
    { method: "POST", path: "/api/users", status: "SCAN" },
  ];

  return (
    <PanelChrome title="Observe" step={2} active={active}>
      <p className="text-[11px] text-text-secondary mb-3 leading-relaxed">
        Every inbound request is inspected with full runtime context.
      </p>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={r.path}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-background border border-border-light"
            style={{
              opacity: active ? 1 : 0.85,
              transform: active && i === 1 ? "translateX(2px)" : undefined,
              transition: "transform 0.3s ease",
            }}
          >
            <span className="text-[9px] font-bold text-brand w-8 shrink-0">{r.method}</span>
            <span className="text-[10px] font-mono text-text-primary truncate flex-1">
              {r.path}
            </span>
            <span className="text-[8px] font-bold tracking-wide text-text-muted">
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </PanelChrome>
  );
}

function ProtectPanel({ active }: { active: boolean }) {
  return (
    <PanelChrome title="Protect" step={3} active={active}>
      <p className="text-[11px] text-text-secondary mb-3 leading-relaxed">
        Block attacks in-process. Scrub PII before telemetry leaves.
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-md px-2.5 py-2 bg-[#fef2f2] border border-[#fecaca]">
          <span className="h-1.5 w-1.5 rounded-full bg-critical shrink-0" />
          <span className="text-[10px] font-semibold text-[#991b1b]">BLOCKED</span>
          <span className="text-[10px] text-text-primary truncate">SQL Injection</span>
          <span className="ml-auto text-[9px] font-mono text-text-muted">0.6 ms</span>
        </div>
        <div className="flex items-center gap-2 rounded-md px-2.5 py-2 bg-[#eff6ff] border border-[#bfdbfe]">
          <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
          <span className="text-[10px] font-semibold text-[#1e40af]">REDACTED</span>
          <span className="text-[10px] text-text-primary truncate">email · token</span>
          <span className="ml-auto text-[9px] font-mono text-text-muted">local</span>
        </div>
      </div>
    </PanelChrome>
  );
}
