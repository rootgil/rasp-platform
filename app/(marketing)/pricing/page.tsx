import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For individual developers and small projects.",
    cta: "Start free",
    ctaHref: "/contact",
    highlight: false,
    features: [
      "1 application",
      "1 agent",
      "Monitor mode only",
      "7-day event retention",
      "100 events/day",
      "Stable channel only",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$299",
    period: "/month",
    description: "For growing teams protecting production workloads.",
    cta: "Start trial",
    ctaHref: "/contact",
    highlight: true,
    features: [
      "10 applications",
      "50 agents",
      "Monitor + Block mode",
      "90-day event retention",
      "Unlimited events",
      "All release channels",
      "API Discovery catalog",
      "Redaction policies",
      "Email + Slack alerts",
      "Standard support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For regulated organizations with advanced compliance requirements.",
    cta: "Contact sales",
    ctaHref: "/contact",
    highlight: false,
    features: [
      "Unlimited applications & agents",
      "Custom retention",
      "On-prem / VPC deployment",
      "PHIPA/Law 25/PIPEDA attestation",
      "HSM-signed agent packages",
      "Custom redaction policies",
      "SSO / SAML integration",
      "Dedicated Slack channel",
      "SLA 99.9%",
      "Annual security review",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#0f172a]">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-[#475569]">No surprise overage fees. No per-event billing.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={tier.highlight ? "border-[#2563eb] ring-2 ring-[#2563eb]/10" : ""}
            >
              {tier.highlight && (
                <div className="bg-[#2563eb] text-white text-xs font-medium text-center py-1.5 rounded-t-[12px]">
                  Most popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-[#0f172a]">{tier.price}</span>
                  <span className="text-[#94a3b8] text-sm">{tier.period}</span>
                </div>
                <p className="text-sm text-[#475569]">{tier.description}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <Button
                  className="w-full"
                  variant={tier.highlight ? "default" : "secondary"}
                  asChild
                >
                  <Link href={tier.ctaHref}>{tier.cta}</Link>
                </Button>
                <ul className="space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#475569]">
                      <CheckCircle2 size={16} className="text-[#16a34a] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[#94a3b8] text-sm">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
