"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  Server,
  ShieldAlert,
  Bell,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Shield,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Shield,
    title: "Welcome to Queno",
    description:
      "Queno protects your applications in real time using RASP agents. This short tour walks you through the key sections of the platform.",
  },
  {
    icon: LayoutDashboard,
    title: "Overview",
    description:
      "The dashboard centralises your security KPIs: critical events, blocked attacks, and online agents. It refreshes automatically every 30 seconds.",
  },
  {
    icon: Boxes,
    title: "Applications",
    description:
      "Each application you want to protect is a project. Create a project, pick the language and framework, then grab your API key to attach agents to it.",
  },
  {
    icon: Server,
    title: "Agents",
    description:
      "Agents are SDK instances running inside your servers. Track their status, version, enforcement mode (monitor / block), and full lifecycle from this section.",
  },
  {
    icon: ShieldAlert,
    title: "Security Events",
    description:
      "Inspect every detected attack attempt - SQL injection, XSS, SSRF, BOLA, and more - with request details, severity, and the action taken (detect or block).",
  },
  {
    icon: Bell,
    title: "Alerts",
    description:
      "Alerts aggregate critical events so you can assign, comment, and resolve them. Fine-tune detection thresholds in the Rules section.",
  },
  {
    icon: KeyRound,
    title: "API Keys",
    description:
      "Generate and revoke the API keys your agents use to authenticate with the collector. Each key is scoped to a project and stored as a hash.",
  },
];

async function markOnboarded() {
  await fetch("/api/account/onboarding", { method: "POST" });
}

export function OnboardingTour({ show }: { show: boolean }) {
  const [open, setOpen] = useState(show);
  const [step, setStep] = useState(0);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  async function handleFinish() {
    await markOnboarded();
    setOpen(false);
  }

  async function handleSkip() {
    await markOnboarded();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light">
              <Icon size={20} className="text-brand" />
            </div>
            <DialogTitle>{current.title}</DialogTitle>
          </div>
          <DialogDescription>{current.description}</DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-200",
                i === step
                  ? "h-2 w-5 bg-brand"
                  : "h-2 w-2 bg-border"
              )}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleSkip}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft size={14} />
                Previous
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={handleFinish}>
                Finish
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
