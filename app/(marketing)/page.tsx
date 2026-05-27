import Link from "next/link";
import {
  ChevronRight,
  CheckCircle2,
  Eye,
  Lock,
  GitBranch,
  Database,
  FileSearch,
  Flag,
  Scale,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LiveDashboard } from "@/components/marketing/live-dashboard";

/* ─── data ──────────────────────────────────────────────── */

const trustLogos = [
  { name: "Node.js", color: "#16a34a" },
  { name: "Python", color: "#2563eb" },
  { name: "Express", color: "#475569" },
  { name: "FastAPI", color: "#0891b2" },
  { name: "Django", color: "#16a34a" },
];

const stats = [
  { value: "< 1 ms", label: "Average added latency" },
  { value: "99.97%", label: "Platform uptime SLA" },
  { value: "OWASP Top 10", label: "Attack coverage" },
];

const features = [
  {
    icon: Eye,
    title: "Runtime API Discovery",
    description:
      "Auto-catalog every endpoint observed in production traffic. Spot shadow APIs, zombie APIs, and unauthenticated routes instantly.",
  },
  {
    icon: Lock,
    title: "Agent-side Redaction",
    description:
      "PII, credentials, and regulated data are scrubbed inside the agent - before any telemetry leaves your environment.",
  },
  {
    icon: FileSearch,
    title: "BOLA / IDOR Detection",
    description:
      "AI-powered detection of broken object-level authorization attacks - the #1 API security risk per OWASP Top 10.",
  },
  {
    icon: GitBranch,
    title: "Canary Agent Lifecycle",
    description:
      "5-stage canary deployment with automatic halt if error rates spike. Pin versions or roll back instantly.",
  },
  {
    icon: Database,
    title: "Multi-tenant Isolation",
    description:
      "Strict org-scoped data access. No cross-tenant query is possible by design. Audited at every layer.",
  },
  {
    icon: Lock,
    title: "Local Audit Trail",
    description:
      "Every redaction decision is logged locally in an append-only audit file. You own the evidence chain.",
  },
];

const steps = [
  {
    num: 1,
    title: "Install in one line",
    desc: "Add the Queno agent with a single require(). No proxies, no sidecars, no infrastructure changes.",
    code: "npm install @queno/agent-node",
  },
  {
    num: 2,
    title: "Observe every request",
    desc: "The agent instruments your runtime and inspects every inbound request with full context of headers, payloads, and session state.",
    code: null,
  },
  {
    num: 3,
    title: "Block threats, redact PII",
    desc: "AI-powered engines detect and block attacks in under a millisecond. Sensitive data is scrubbed before any telemetry leaves your environment.",
    code: null,
  },
];

const testimonials = [
  {
    quote:
      "Queno gave us PIPEDA and Loi 25 coverage on day one. The agent-side redaction was exactly what our legal team required before we could ship to production.",
    name: "Marie-Eve Tremblay",
    role: "CISO",
    company: "Veridian Financial",
  },
  {
    quote:
      "We went from zero API visibility to full PHIPA-compliant monitoring in under an hour. The BOLA detection has caught real incidents we would have missed entirely.",
    name: "James Whitfield",
    role: "VP Engineering",
    company: "Clearpath Health",
  },
  {
    quote:
      "The guarantee that no PII ever leaves our environment was the deciding factor. Queno was the only solution that could back that claim architecturally, not just by policy.",
    name: "Aditi Sharma",
    role: "Head of Security",
    company: "Northside Lending",
  },
];

const compliance = [
  {
    Icon: Flag,
    title: "PIPEDA",
    desc: "Personal Information Protection and Electronic Documents Act. Consent, purpose limitation, and breach notification built in.",
  },
  {
    Icon: Scale,
    title: "Loi 25 (Québec)",
    desc: "Quebec's private sector privacy law with stricter breach notification, data inventories, and privacy impact assessments.",
  },
  {
    Icon: Heart,
    title: "PHIPA (Ontario)",
    desc: "Personal Health Information Protection Act. Agent-side redaction ensures no PHI transits the network.",
  },
];

/* ─── page ───────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div>
      {/* ── 1. Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 md:py-28 lg:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#eff6ff] via-[#f8fafc] to-white" />
          {/* Glow orbs */}
          <div
            className="absolute -top-40 -right-40 h-[640px] w-[640px] rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-32 -left-32 h-[480px] w-[480px] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - text */}
            <div className="text-center lg:text-left">
              <div
                className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-white/80 backdrop-blur px-3 py-1 mb-8"
                style={{ animationDelay: "0s" }}
              >
                <span className="anim-status-pulse h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
                <span className="text-xs font-medium text-[#1e40af]">
                  Built for regulated Canadian workloads
                </span>
              </div>

              <h1
                className="anim-fade-up text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-[#0f172a] leading-[1.08] tracking-tight"
                style={{ animationDelay: "0.1s" }}
              >
                AI-Native RASP for
                <br />
                <span className="text-[#2563eb]">APIs in Production</span>
              </h1>

              <p
                className="anim-fade-up mt-6 text-lg text-[#475569] leading-relaxed max-w-xl mx-auto lg:mx-0"
                style={{ animationDelay: "0.2s" }}
              >
                Runtime Application Self-Protection that detects and blocks
                attacks inside your running application. PIPEDA, Law 25, and
                PHIPA compliant. Zero infrastructure changes required.
              </p>

              <div
                className="anim-fade-up mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3"
                style={{ animationDelay: "0.3s" }}
              >
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

              {/* Stack strip */}
              <div
                className="anim-fade-up mt-10 pt-8 border-t border-[#e2e8f0]"
                style={{ animationDelay: "0.4s" }}
              >
                <p className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-widest mb-3">
                  Works with your stack
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5">
                  {trustLogos.map((lang) => (
                    <div key={lang.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: lang.color }}
                      />
                      <span className="text-sm font-medium text-[#475569]">
                        {lang.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right - animated dashboard */}
            <div
              className="anim-slide-right"
              style={{ animationDelay: "0.15s" }}
            >
              <LiveDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Stats bar ───────────────────────────────────── */}
      <section className="border-y border-[#e2e8f0] bg-white py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#e2e8f0] text-center">
            {stats.map(({ value, label }) => (
              <div key={label} className="px-6 py-4 sm:py-2">
                <div className="text-2xl md:text-3xl font-bold text-[#0f172a]">
                  {value}
                </div>
                <div className="mt-1 text-sm text-[#475569]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Features grid ───────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a]">
              Security that runs with your code
            </h2>
            <p className="mt-4 text-lg text-[#475569] max-w-2xl mx-auto">
              Unlike perimeter tools, Queno operates inside your application
              process - with full context of every call.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-[12px] border border-[#e2e8f0] bg-white p-6 transition-all duration-200 hover:border-[#2563eb]/40 hover:shadow-[0_4px_20px_rgba(37,99,235,0.08)] hover:-translate-y-0.5"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                  }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eff6ff] mb-4 group-hover:bg-[#dbeafe] transition-colors">
                    <Icon size={20} className="text-[#2563eb]" strokeWidth={2} />
                  </div>
                  <h3 className="text-base font-semibold text-[#0f172a] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. How it works ────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[#f8fafc] border-y border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a]">
              Deploy in minutes
            </h2>
            <p className="mt-4 text-lg text-[#475569] max-w-xl mx-auto">
              One require. No code changes. Full protection immediately.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-0 relative">
            {/* Connector lines (desktop) */}
            <div className="hidden md:block absolute top-[2.375rem] left-[calc(33.33%+8px)] right-[calc(33.33%+8px)] h-px bg-gradient-to-r from-[#cbd5e1] via-[#93c5fd] to-[#cbd5e1]" />

            {steps.map((step, i) => (
              <div
                key={step.num}
                className="relative flex flex-col items-center text-center px-6 py-6"
              >
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#2563eb] text-white text-sm font-bold mb-5 shadow-[0_0_0_6px_rgba(37,99,235,0.12)]">
                  {step.num}
                </div>
                <h3 className="font-semibold text-[#0f172a] mb-2 text-base">
                  {step.title}
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed mb-4">
                  {step.desc}
                </p>
                {step.code && (
                  <code className="text-xs bg-[#0f172a] text-[#93c5fd] rounded-[6px] px-3 py-1.5 font-mono">
                    {step.code}
                  </code>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Agent snippet ───────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Zero config. Full coverage.
              </h2>
              <p className="text-[#94a3b8] mb-6 leading-relaxed">
                One require. The Queno agent instruments your application at
                runtime and begins protecting it immediately.
              </p>
              <ul className="space-y-3">
                {[
                  "No code changes required",
                  "Fail-open by default - never blocks your app",
                  "Sub-millisecond overhead",
                  "Works with any Node.js framework",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-[#94a3b8]"
                  >
                    <CheckCircle2
                      size={16}
                      className="text-[#16a34a] shrink-0"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-8" size="lg" asChild>
                <Link href="/contact">Get started →</Link>
              </Button>
            </div>

            {/* Code block */}
            <div className="rounded-[12px] bg-[#1e293b] border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/10">
                <div className="h-3 w-3 rounded-full bg-[#dc2626]/70" />
                <div className="h-3 w-3 rounded-full bg-[#d97706]/70" />
                <div className="h-3 w-3 rounded-full bg-[#16a34a]/70" />
                <span className="ml-2 text-xs text-[#475569]">server.js</span>
              </div>
              <pre className="p-6 text-sm font-mono text-[#e2e8f0] overflow-auto leading-relaxed">
{`// npm install @queno/agent-node

require('@queno/agent-node').init({
  apiKey: process.env.QUENO_API_KEY,
  channel: 'stable',
  mode: 'monitor', // or 'block'
  redaction: {
    mode: 'denylist',
    patterns: [
      'email', 'password',
      'authorization', 'token',
    ],
  },
});

// Your existing app - unchanged
const express = require('express');
const app = express();
// ...`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Testimonials ────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a]">
              Trusted by security teams
            </h2>
            <p className="mt-4 text-lg text-[#475569]">
              Protecting production APIs across regulated Canadian industries.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-[12px] border border-[#e2e8f0] bg-white p-6 flex flex-col gap-5 transition-all duration-200 hover:border-[#2563eb]/30 hover:shadow-[0_4px_20px_rgba(37,99,235,0.07)]"
              >
                {/* Quote mark */}
                <svg
                  width="28"
                  height="20"
                  viewBox="0 0 28 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M0 20V12.5C0 5.596 4.148 1.373 12.444 0L13.778 2.5C10.815 3.183 8.926 4.41 8.111 6.18 7.667 7.147 7.519 8.167 7.667 9.24H13.333V20H0ZM14.667 20V12.5C14.667 5.596 18.815 1.373 27.111 0L28 2.5C25.037 3.183 23.148 4.41 22.333 6.18c-.444.967-.593 1.987-.444 3.06H27.333V20H14.667Z"
                    fill="#dbeafe"
                  />
                </svg>

                <p className="text-[#475569] text-sm leading-relaxed flex-1">
                  {t.quote}
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-[#f1f5f9]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb] text-sm font-bold shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{t.name}</p>
                    <p className="text-xs text-[#94a3b8]">
                      {t.role}, {t.company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Compliance ──────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[#f8fafc] border-t border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0f172a]">
              Built for Canadian compliance
            </h2>
            <p className="mt-3 text-[#475569] max-w-xl mx-auto">
              Designed from the ground up for PIPEDA, Law 25, and PHIPA
              requirements.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {compliance.map(({ Icon, title, desc }) => (
              <Card key={title} className="hover:border-[#2563eb]/40 transition-colors">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eff6ff] mb-4">
                    <Icon size={18} className="text-[#2563eb]" strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-[#0f172a] mb-2">{title}</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. CTA ─────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-[#2563eb]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to protect your APIs?
          </h2>
          <p className="text-[#bfdbfe] mb-8 text-lg max-w-xl mx-auto">
            Join security teams across Canada protecting their production APIs
            with Queno.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-[#2563eb] hover:bg-[#f8fafc] shadow-md"
              asChild
            >
              <Link href="/contact">Book a demo</Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10"
              asChild
            >
              <Link href="/features">Explore features →</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
