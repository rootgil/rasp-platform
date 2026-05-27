import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Lock, Shield, GitBranch, Database, FileSearch } from "lucide-react";
import Link from "next/link";

const sections = [
  {
    id: "discovery",
    icon: Eye,
    title: "A. Runtime API Discovery",
    subtitle: "Know your attack surface before attackers do",
    description: "The RASP agent passively observes every inbound request and automatically builds a live inventory of all API endpoints, authentication methods, and data sensitivity indicators.",
    features: [
      "Automatic OpenAPI spec generation from observed traffic",
      "Shadow API detection — routes not in your official spec",
      "Zombie API detection — routes with no traffic in 30+ days",
      "Unauthenticated endpoint flagging",
      "Risk scoring per endpoint based on auth, sensitivity, and traffic patterns",
    ],
  },
  {
    id: "redaction",
    icon: Lock,
    title: "B. Agent-side Data Redaction",
    subtitle: "Scrub at the source — before data leaves your environment",
    description: "Unlike cloud-based solutions, RASP redacts sensitive data inside your application process. If redaction fails for any reason, the event is dropped entirely — never transmitted with raw data.",
    features: [
      "Denylist mode — strip known-sensitive patterns",
      "Allowlist mode — only permit explicitly approved fields",
      "Metadata-only mode — send attack metadata, no payload",
      "Local-only mode — all telemetry stays on-prem",
      "HMAC-signed local audit log for every redaction decision",
    ],
  },
  {
    id: "detection",
    icon: Shield,
    title: "C. Attack Detection",
    subtitle: "Block the OWASP API Top 10",
    description: "AI-powered detection engines operate inside your application runtime, with full access to request context, session state, and business logic.",
    features: [
      "SQL Injection (pattern + AST analysis)",
      "Path Traversal",
      "Command Injection",
      "BOLA/IDOR — Broken Object-Level Authorization",
      "SSRF, XSS, Deserialization attacks",
      "Monitor mode (log only) or Block mode per rule",
    ],
  },
  {
    id: "lifecycle",
    icon: GitBranch,
    title: "D. Agent Lifecycle Management",
    subtitle: "Zero-downtime updates with automatic safety gates",
    description: "Agents self-update through a 5-stage canary deployment process. Updates halt automatically if error rates or latency metrics degrade.",
    features: [
      "Stable, Early, and Edge release channels",
      "5-stage canary: dogfood → 1% → 10% → 100% Edge → 100% Stable",
      "Auto-halt on error rate >0.01% or latency increase >2%",
      "Kill-switch: disable agent within 60 seconds from the dashboard",
      "Version pinning per application",
    ],
  },
  {
    id: "isolation",
    icon: Database,
    title: "E. Multi-tenant Isolation",
    subtitle: "Enterprise-grade tenant separation",
    description: "Every query is scoped to the authenticated organization. Cross-tenant data access is architecturally impossible — not just policy-enforced.",
    features: [
      "Organization-scoped data access at the ORM layer",
      "Double RBAC: middleware + server-side check on every request",
      "API keys hashed with bcrypt — never stored in plaintext",
      "HMAC verification on all collector payloads",
      "Rate limiting per API key",
    ],
  },
  {
    id: "audit",
    icon: FileSearch,
    title: "F. Local Audit Trail",
    subtitle: "Immutable evidence chain that you control",
    description: "Every redaction decision generates a signed local audit log entry. The audit log is append-only, HMAC-signed, and rotates automatically at 10MB.",
    features: [
      "Append-only JSONL format on local disk",
      "HMAC-SHA256 chaining — detect tampering",
      "Rotation at 10MB with compression",
      "Retention configurable (default 90 days)",
      "Export to SIEM via syslog or file watcher",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[#0f172a]">Platform Features</h1>
          <p className="mt-4 text-lg text-[#475569] max-w-2xl mx-auto">
            Every capability designed for security teams operating in regulated environments.
          </p>
        </div>

        <div className="space-y-16">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                id={section.id}
                className={`grid md:grid-cols-2 gap-8 items-start ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eff6ff]">
                      <Icon size={20} className="text-[#2563eb]" strokeWidth={2} />
                    </div>
                    <span className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Feature</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#0f172a] mb-2">{section.title}</h2>
                  <p className="text-base font-medium text-[#2563eb] mb-4">{section.subtitle}</p>
                  <p className="text-[#475569] leading-relaxed">{section.description}</p>
                </div>

                <Card>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {section.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-[#475569]">
                          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Button size="lg" asChild>
            <Link href="/contact">Book a demo →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
