"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Visual pipeline: inbound request → agent redaction → safe telemetry.
 * Designed for the dark "Zero config" section — proves redaction happens
 * inside the customer process before anything reaches the collector.
 */
export function RedactionPipeline() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-[#1e293b] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-xs font-semibold text-white tracking-wide">
            Agent-side redaction
          </span>
        </div>
        <span className="text-[10px] text-text-muted font-mono">before egress</span>
      </div>

      <div className="p-4 space-y-0">
        <Stage label="Inbound" active={step === 0} tone="raw">
          <code className="block text-[11px] font-mono text-[#fca5a5] break-all leading-relaxed">
            {`{ "email": "a@bank.ca", "password": "••••", "ssn": "123-45-6789" }`}
          </code>
        </Stage>

        <Arrow active={step >= 1} />

        <Stage label="Queno agent" active={step === 1} tone="agent">
          <div className="grid grid-cols-2 gap-1.5">
            {["email", "password", "ssn", "authorization"].map((f) => (
              <span
                key={f}
                className="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-[#1e3a5f] text-[#93c5fd] border border-[#2563eb]/40 truncate text-center"
              >
                {f} → [REDACTED]
              </span>
            ))}
          </div>
        </Stage>

        <Arrow active={step >= 2} />

        <Stage label="Telemetry out" active={step === 2} tone="safe">
          <code className="block text-[11px] font-mono text-[#86efac] break-all leading-relaxed">
            {`{ "email": "[REDACTED]", "password": "[REDACTED]", "ssn": "[REDACTED]" }`}
          </code>
          <p className="mt-2 text-[10px] text-text-muted">
            Local audit log written · raw values never leave the process
          </p>
        </Stage>
      </div>
    </div>
  );
}

function Stage({
  label,
  active,
  tone,
  children,
}: {
  label: string;
  active: boolean;
  tone: "raw" | "agent" | "safe";
  children: ReactNode;
}) {
  const border =
    tone === "raw"
      ? "border-[#7f1d1d]/50"
      : tone === "agent"
        ? "border-[#1e40af]/50"
        : "border-[#166534]/50";
  const bg =
    tone === "raw"
      ? "bg-[#450a0a]/40"
      : tone === "agent"
        ? "bg-[#172554]/40"
        : "bg-[#052e16]/40";

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-all duration-300 ${border} ${bg} ${
        active ? "opacity-100" : "opacity-55"
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function Arrow({ active }: { active: boolean }) {
  return (
    <div
      className={`flex justify-center py-1.5 transition-opacity duration-300 ${
        active ? "opacity-100" : "opacity-30"
      }`}
      aria-hidden="true"
    >
      <svg width="12" height="22" viewBox="0 0 12 22" fill="none" className="text-[#64748b]">
        <path
          d="M6 1V14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M2.5 11.5L6 16.5L9.5 11.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
