import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, FileSearch, Cpu, Server, RadioTower, Flag, Scale, Heart } from "lucide-react";

const principles = [
  {
    icon: Lock,
    title: "Scrub at the Source",
    body: "All sensitive data is redacted inside the Queno agent - before any telemetry leaves the customer environment. Even if the control plane is compromised, no PII, credentials, or regulated data has been transmitted in cleartext.",
  },
  {
    icon: FileSearch,
    title: "Immutable Local Audit Log",
    body: "Every redaction decision generates an HMAC-chained entry in an append-only local file. Tampering is detectable. The customer owns the complete evidence chain.",
  },
  {
    icon: Cpu,
    title: "Fail-Open Agent Design",
    body: "If the Queno agent encounters an unexpected error, it logs the issue and passes the request through unchanged. It never blocks your application, even in block mode, when it cannot make a confident decision.",
  },
  {
    icon: Server,
    title: "Kill Switch",
    body: "Operators can disable any agent from the dashboard. The agent self-disables within 60 seconds of the next heartbeat. Useful for emergency maintenance or incident response.",
  },
  {
    icon: Shield,
    title: "API Key Security",
    body: "API keys are bcrypt-hashed at creation. Only the prefix is stored. The raw key is shown once, then irretrievable. Revocation propagates to the collector within 60 seconds.",
  },
  {
    icon: RadioTower,
    title: "HMAC Payload Verification",
    body: "All telemetry from agents to the collector is HMAC-SHA256 signed. Tampered or replayed events are rejected. mTLS is used on the collector transport layer.",
  },
];

export default function SecurityPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl font-bold text-text-primary">Security & Privacy</h1>
          <p className="mt-4 text-lg text-text-secondary">
            Queno is designed for organizations that cannot afford to leak data - healthcare, finance, legal, and government.
          </p>
        </div>

        {/* Compliance grid */}
        <div className="grid sm:grid-cols-3 gap-6 mb-16">
          {[
            { Icon: Flag, law: "PIPEDA", body: "Federal private sector privacy law. Consent, purpose limitation, breach notification within 72 hours." },
            { Icon: Scale, law: "Loi 25 (Québec)", body: "Stricter breach notification requirements, mandatory privacy impact assessments, data inventory." },
            { Icon: Heart, law: "PHIPA (Ontario)", body: "Personal Health Information Protection Act. Agent-side redaction ensures zero PHI in transit." },
          ].map(({ Icon, law, body }) => (
            <Card key={law} className="border-[#bfdbfe]">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-light mb-4">
                  <Icon size={18} className="text-brand" strokeWidth={2} />
                </div>
                <h3 className="font-bold text-text-primary mb-2">{law}</h3>
                <p className="text-sm text-text-secondary">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-8">Security Architecture</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {principles.map((p) => {
            const Icon = p.icon;
            return (
              <Card key={p.title}>
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-light mb-4">
                    <Icon size={20} className="text-brand" strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-text-primary mb-2">{p.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{p.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* SBOM & Signing note */}
        <div className="rounded-lg border border-border bg-background p-8">
          <h3 className="text-lg font-bold text-text-primary mb-4">Supply Chain Security</h3>
          <div className="grid sm:grid-cols-2 gap-6 text-sm text-text-secondary">
            <div>
              <h4 className="font-semibold text-text-primary mb-2">SBOM</h4>
              <p>Every agent release includes a full Software Bill of Materials (SBOM) in SPDX format. Dependency vulnerabilities are scanned on every build.</p>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-2">HSM Signing</h4>
              <p>Agent packages are signed with an HSM-backed key. The public key is published in DNS for verification. Never install an unsigned agent.</p>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-2">mTLS</h4>
              <p>All agent-to-collector communication uses mutual TLS. Both parties authenticate with certificates. No unencrypted telemetry.</p>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-2">Rate Limiting</h4>
              <p>100 events/second per API key. 10 heartbeats/minute per agent. Collector rejects oversized payloads (max 512KB) before inspection.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
