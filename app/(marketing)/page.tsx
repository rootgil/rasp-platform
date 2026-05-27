import Link from "next/link";
import { Shield, ChevronRight, CheckCircle2, Eye, Lock, GitBranch, Database, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Eye,
    title: "Runtime API Discovery",
    description: "Auto-catalog every endpoint observed in production traffic. Spot shadow APIs, zombie APIs, and unauthenticated routes instantly.",
  },
  {
    icon: Lock,
    title: "Agent-side Redaction",
    description: "PII, credentials, and regulated data are scrubbed inside the agent — before any telemetry leaves your environment.",
  },
  {
    icon: Shield,
    title: "BOLA/IDOR Detection",
    description: "AI-powered detection of broken object-level authorization attacks — the #1 API security risk per OWASP Top 10.",
  },
  {
    icon: GitBranch,
    title: "Canary Agent Lifecycle",
    description: "5-stage canary deployment with automatic halt if error rates spike. Pin versions or roll back instantly.",
  },
  {
    icon: Database,
    title: "Multi-tenant Isolation",
    description: "Strict org-scoped data access. No cross-tenant query is possible by design. Audited at every layer.",
  },
  {
    icon: FileSearch,
    title: "Local Audit Trail",
    description: "Every redaction decision is logged locally in an append-only audit file. You own the evidence chain.",
  },
];

const trustLogos = [
  { name: "Node.js", color: "#16a34a" },
  { name: "Python", color: "#2563eb" },
  { name: "Express", color: "#475569" },
  { name: "FastAPI", color: "#0891b2" },
  { name: "Django", color: "#16a34a" },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#eff6ff] via-white to-white pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
              <span className="text-xs font-medium text-[#1e40af]">Built for regulated Canadian workloads</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-[#0f172a] leading-[1.1] tracking-tight">
              AI-Native RASP for<br />
              <span className="text-[#2563eb]">APIs in Production</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-[#475569] max-w-2xl mx-auto leading-relaxed">
              Runtime Application Self-Protection that detects and blocks attacks inside your running application.
              PIPEDA, Law 25, and PHIPA compliant. Zero infrastructure changes required.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Book a demo
                  <ChevronRight size={16} />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/features">Explore features →</Link>
              </Button>
            </div>

            {/* Trust strip */}
            <div className="mt-12 pt-8 border-t border-[#e2e8f0]">
              <p className="text-xs text-[#94a3b8] mb-4 uppercase tracking-wide">Works with your stack</p>
              <div className="flex flex-wrap items-center justify-center gap-6">
                {trustLogos.map((lang) => (
                  <div key={lang.name} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: lang.color }} />
                    <span className="text-sm font-medium text-[#475569]">{lang.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a]">
              Security that runs with your code
            </h2>
            <p className="mt-4 text-lg text-[#475569] max-w-2xl mx-auto">
              Unlike perimeter tools, RASP operates inside your application process — with full context of every call.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="hover:border-[#2563eb] transition-colors">
                  <CardContent className="p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eff6ff] mb-4">
                      <Icon size={20} className="text-[#2563eb]" strokeWidth={2} />
                    </div>
                    <h3 className="text-base font-semibold text-[#0f172a] mb-2">{feature.title}</h3>
                    <p className="text-sm text-[#475569] leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Agent snippet */}
      <section className="py-16 md:py-24 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Deploy in minutes
              </h2>
              <p className="text-[#94a3b8] mb-6">
                One require. Zero infrastructure changes. The RASP agent instruments your application at runtime
                and begins protecting it immediately.
              </p>
              <ul className="space-y-3">
                {[
                  "No code changes required",
                  "Fail-open by default — never blocks your app",
                  "Sub-millisecond overhead",
                  "Works with any Node.js framework",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[#94a3b8]">
                    <CheckCircle2 size={16} className="text-[#16a34a] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-6" size="lg" asChild>
                <Link href="/contact">Get started →</Link>
              </Button>
            </div>
            <div className="rounded-[12px] bg-[#1e293b] border border-white/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-[#dc2626]" />
                <div className="h-3 w-3 rounded-full bg-[#d97706]" />
                <div className="h-3 w-3 rounded-full bg-[#16a34a]" />
                <span className="ml-2 text-xs text-[#475569]">server.js</span>
              </div>
              <pre className="text-sm font-mono text-[#e2e8f0] overflow-auto">
{`// Install: npm install @rasp/agent-node

require('@rasp/agent-node').init({
  apiKey: process.env.RASP_API_KEY,
  channel: 'stable',
  mode: 'monitor', // or 'block'
  redaction: {
    mode: 'denylist',
    patterns: ['email', 'password',
               'authorization', 'token'],
  },
});

// Your existing app — unchanged
const express = require('express');
const app = express();
// ...`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0f172a]">Built for Canadian compliance</h2>
            <p className="mt-3 text-[#475569]">Designed from the ground up for PIPEDA, Law 25, and PHIPA requirements.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { title: "PIPEDA", desc: "Personal Information Protection and Electronic Documents Act. Consent, purpose limitation, and breach notification built in.", flag: "🇨🇦" },
              { title: "Loi 25 (Québec)", desc: "Quebec's private sector privacy law with stricter breach notification, data inventories, and privacy impact assessments.", flag: "🔒" },
              { title: "PHIPA (Ontario)", desc: "Personal Health Information Protection Act. Agent-side redaction ensures no PHI transits the network.", flag: "🏥" },
            ].map((c) => (
              <Card key={c.title}>
                <CardContent className="p-6">
                  <div className="text-2xl mb-3">{c.flag}</div>
                  <h3 className="font-semibold text-[#0f172a] mb-2">{c.title}</h3>
                  <p className="text-sm text-[#475569]">{c.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-[#2563eb]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to protect your APIs?
          </h2>
          <p className="text-[#bfdbfe] mb-8 text-lg">
            Join organizations protecting their production APIs with AI-native RASP.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-white text-[#2563eb] hover:bg-[#f8fafc]" asChild>
              <Link href="/contact">Book a demo</Link>
            </Button>
            <Button size="lg" variant="ghost" className="text-white hover:bg-white/10" asChild>
              <Link href="/features">Learn more →</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
