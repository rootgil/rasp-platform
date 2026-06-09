"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, MapPin, Mail } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-text-primary">Talk to us</h1>
          <p className="mt-4 text-lg text-text-secondary">
            Book a 30-minute demo with our team. We&apos;ll show you how Queno works in your stack.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {status === "success" ? (
            <Card className="md:col-span-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 size={48} className="text-success mb-4" />
                <h2 className="text-xl font-bold text-text-primary">Message received!</h2>
                <p className="text-text-secondary mt-2">We&apos;ll be in touch within one business day.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full name</Label>
                    <Input
                      placeholder="Alex Chen"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Work email</Label>
                    <Input
                      type="email"
                      placeholder="alex@company.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company</Label>
                    <Input
                      placeholder="Acme Financial Corp."
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>What are you trying to protect?</Label>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                      placeholder="Tell us about your stack, compliance requirements, or specific use case…"
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-sm text-critical">Something went wrong. Please try again.</p>
                  )}

                  <Button type="submit" className="w-full" disabled={status === "loading"}>
                    {status === "loading" ? "Sending…" : "Book a demo"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-3">What to expect</h3>
              <ul className="space-y-3">
                {[
                  "30-minute live demo of the dashboard",
                  "Walk through agent installation in your stack",
                  "Review compliance requirements (PIPEDA / Law 25 / PHIPA)",
                  "Discuss pricing and deployment options",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                    <CheckCircle2 size={16} className="text-brand mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm text-text-secondary">
                <MapPin size={16} className="text-text-muted mt-0.5 shrink-0" />
                <p>Montréal, QC, Canada<br />Remote-first team</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-text-secondary">
                <Mail size={16} className="text-text-muted mt-0.5 shrink-0" />
                <p>security@queno.io</p>
              </div>
            </div>

            <Card className="border-[#bfdbfe] bg-brand-light">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-low-text mb-1">Try it yourself</p>
                <a href="/login" className="mt-2 text-xs text-brand underline">
                  → Open the demo dashboard
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
