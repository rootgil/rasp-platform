"use client";

import { useEffect, useRef, useState } from "react";

const FEED_EVENTS = [
  { kind: "block", severity: "critical", label: "SQL Injection", route: "POST /api/users" },
  { kind: "block", severity: "high", label: "BOLA attempt", route: "GET /api/orders/94821" },
  { kind: "redact", severity: "info", label: "PII redacted", route: "POST /api/auth/login" },
  { kind: "block", severity: "critical", label: "Path traversal", route: "GET /static/../etc" },
  { kind: "redact", severity: "info", label: "Token stripped", route: "POST /api/payments" },
  { kind: "block", severity: "high", label: "SSRF detected", route: "POST /api/webhook" },
  { kind: "redact", severity: "info", label: "Email redacted", route: "GET /api/profile/112" },
  { kind: "block", severity: "high", label: "Command inject", route: "POST /api/export" },
  { kind: "block", severity: "critical", label: "XSS payload", route: "POST /api/comments" },
  { kind: "redact", severity: "info", label: "SSN redacted", route: "PUT /api/kyc/verify" },
];

const SEV = {
  critical: { dot: "#dc2626", tagBg: "#fef2f2", tagText: "#991b1b", rowBg: "#fef2f2", tag: "BLOCKED" },
  high:     { dot: "#ea580c", tagBg: "#fff7ed", tagText: "#9a3412", rowBg: "#fff7ed",  tag: "BLOCKED" },
  info:     { dot: "#2563eb", tagBg: "#eff6ff", tagText: "#1e40af", rowBg: "#eff6ff",  tag: "REDACTED" },
};

type EventItem = {
  kind: string;
  severity: string;
  label: string;
  route: string;
  id: number;
};

export function LiveDashboard() {
  const idRef = useRef(10);
  const tickRef = useRef(0);

  const [feed, setFeed] = useState<EventItem[]>(() =>
    FEED_EVENTS.slice(0, 4).map((e, i) => ({ ...e, id: i }))
  );
  const [blocked, setBlocked] = useState(1284);
  const [reqsMin, setReqsMin] = useState(2847);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current = (tickRef.current + 1) % FEED_EVENTS.length;
      const next: EventItem = { ...FEED_EVENTS[tickRef.current], id: idRef.current++ };
      setFeed((prev) => [next, ...prev.slice(0, 3)]);
      if (next.kind === "block") setBlocked((n) => n + 1);
      setReqsMin((n) => n + Math.floor(Math.random() * 9 + 2));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Subtle blue shadow glow */}
      <div
        className="absolute -inset-4 rounded-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(37,99,235,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden shadow-[0_8px_40px_rgba(37,99,235,0.10),0_2px_8px_rgba(15,23,42,0.06)]">
        {/* Window bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16a34a]" />
            </span>
            <span className="text-xs font-semibold text-[#0f172a] tracking-wide">Live Protection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#dc2626]/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#d97706]/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#16a34a]/50" />
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 divide-x divide-[#e2e8f0]">
          {[
            { label: "Req / min", value: reqsMin.toLocaleString() },
            { label: "Blocked", value: blocked.toLocaleString() },
            { label: "Latency", value: "0.8 ms" },
          ].map(({ label, value }) => (
            <div key={label} className="py-4 text-center">
              <div className="text-xl font-bold text-[#0f172a] tabular-nums">{value}</div>
              <div className="mt-0.5 text-[10px] font-medium text-[#94a3b8] uppercase tracking-widest">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Threat feed */}
        <div className="px-4 pt-3 pb-2 border-t border-[#e2e8f0]">
          <p className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-[0.12em] mb-2">
            Threat feed
          </p>
          <div className="space-y-0.5">
            {feed.map((evt, i) => {
              const s = SEV[evt.severity as keyof typeof SEV];
              return (
                <div
                  key={evt.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
                  style={{
                    backgroundColor: i === 0 ? s.rowBg : "transparent",
                    animation: i === 0 ? "event-in 0.38s ease both" : undefined,
                    opacity: 1 - i * 0.18,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.dot }}
                  />
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold tracking-wide"
                    style={{ backgroundColor: s.tagBg, color: s.tagText }}
                  >
                    {s.tag}
                  </span>
                  <span className="text-[11px] text-[#0f172a] flex-1 truncate">{evt.label}</span>
                  <span className="text-[9px] font-mono text-[#94a3b8] shrink-0 max-w-[110px] truncate">
                    {evt.route}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attack type bar chart */}
        <div className="px-4 pt-2 pb-4 border-t border-[#e2e8f0] mt-1">
          <p className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-[0.12em] mb-2.5">
            Attack types · 24 h
          </p>
          <div className="space-y-2">
            {[
              { name: "SQLi / NoSQLi", pct: 72, color: "#dc2626" },
              { name: "BOLA / IDOR",   pct: 55, color: "#ea580c" },
              { name: "Path traversal", pct: 38, color: "#d97706" },
            ].map(({ name, pct, color }) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-[10px] text-[#475569] w-[88px] shrink-0">{name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
                  />
                </div>
                <span className="text-[9px] text-[#94a3b8] w-6 text-right tabular-nums">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
