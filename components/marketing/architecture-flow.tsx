/**
 * Architecture diagram: where Queno runs in the customer stack.
 * HTML/CSS only — same visual language as LiveDashboard.
 */
export function ArchitectureFlow() {
  const nodes = [
    {
      label: "Your app",
      sub: "Express · Fastify · Nest",
      accent: "#0f172a",
      badge: "Host process",
    },
    {
      label: "Queno agent",
      sub: "Detect · Redact · Fail-open",
      accent: "#2563eb",
      badge: "In-process",
      highlight: true,
    },
    {
      label: "Collector",
      sub: "Ingest · Alerts",
      accent: "#0891b2",
      badge: "Your region",
    },
    {
      label: "Dashboard",
      sub: "Events · Rules · Audit",
      accent: "#16a34a",
      badge: "Control plane",
    },
  ];

  return (
    <div className="relative">
      <div
        className="absolute -inset-3 rounded-3xl pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative rounded-2xl border border-border bg-white overflow-hidden shadow-[0_8px_40px_rgba(37,99,235,0.08),0_2px_8px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
            </span>
            <span className="text-xs font-semibold text-text-primary tracking-wide">
              Runtime architecture
            </span>
          </div>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
            No proxy · No sidecar
          </span>
        </div>

        <div className="p-5 md:p-8">
          {/* Flow nodes */}
          <div className="flex flex-col md:flex-row md:items-stretch gap-3 md:gap-0">
            {nodes.map((node, i) => (
              <div key={node.label} className="flex flex-col md:flex-row md:items-center flex-1 min-w-0">
                <div
                  className={`flex-1 rounded-xl border px-4 py-4 ${
                    node.highlight
                      ? "border-brand/40 bg-brand-light/60 shadow-[0_0_0_1px_rgba(37,99,235,0.08)]"
                      : "border-border bg-background"
                  }`}
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted mb-1.5">
                    {node.badge}
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: node.accent }}
                  >
                    {node.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-secondary leading-snug">
                    {node.sub}
                  </p>
                </div>

                {i < nodes.length - 1 && (
                  <div
                    className="flex md:flex-col items-center justify-center py-1 md:py-0 md:px-2 shrink-0"
                    aria-hidden="true"
                  >
                    <div className="md:hidden h-5 w-px bg-linear-to-b from-[#93c5fd] to-[#cbd5e1]" />
                    <div className="hidden md:block w-6 h-px bg-linear-to-r from-[#93c5fd] to-[#cbd5e1]" />
                    <svg
                      className="hidden md:block text-brand/50 -ml-0.5"
                      width="8"
                      height="10"
                      viewBox="0 0 8 10"
                      fill="currentColor"
                    >
                      <path d="M0 0L8 5L0 10V0Z" />
                    </svg>
                    <svg
                      className="md:hidden text-brand/50 -mt-0.5 rotate-90"
                      width="8"
                      height="10"
                      viewBox="0 0 8 10"
                      fill="currentColor"
                    >
                      <path d="M0 0L8 5L0 10V0Z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Callout strip */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
                Stays in your VPC
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Raw request bodies and secrets never leave the agent. Only redacted telemetry is sent.
              </p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
                Policy from dashboard
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Detection rules are chosen on the platform and delivered as a signed policy to the agent.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
