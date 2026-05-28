"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Copy, Check } from "lucide-react";

const LANGUAGES = [
  { value: "node", label: "Node.js" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "dotnet", label: ".NET" },
];

type SetupData = {
  agentId: string;
  rawKey: string | null;
};

type CopyState = { agentId: boolean; rawKey: boolean };

export function CreateAgentDialog({
  children,
  projects,
}: {
  children: React.ReactNode;
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "setup">("form");
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [copied, setCopied] = useState<CopyState>({ agentId: false, rawKey: false });
  const [form, setForm] = useState({
    projectId: "",
    language: "",
    framework: "",
    mode: "monitor",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: form.projectId,
          language: form.language,
          framework: form.framework || undefined,
          mode: form.mode,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSetup({ agentId: data.agent.id, rawKey: data.rawKey });
        setStep("setup");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(field: keyof CopyState, value: string) {
    navigator.clipboard.writeText(value);
    setCopied((s) => ({ ...s, [field]: true }));
    setTimeout(() => setCopied((s) => ({ ...s, [field]: false })), 2000);
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setStep("form");
      setSetup(null);
      setForm({ projectId: "", language: "", framework: "", mode: "monitor" });
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Register Agent" : "Agent registered — save your credentials"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Application</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select application…" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select
                value={form.language}
                onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select language…" /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Framework <span className="text-text-muted text-xs">(optional)</span></Label>
              <Input
                placeholder="express, fastify, django…"
                value={form.framework}
                onChange={(e) => setForm((f) => ({ ...f, framework: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select
                value={form.mode}
                onValueChange={(v) => setForm((f) => ({ ...f, mode: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monitor">Monitor — detect only</SelectItem>
                  <SelectItem value="block">Block — enforce rules</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button
                type="submit"
                disabled={loading || !form.projectId || !form.language}
              >
                {loading ? "Registering…" : "Register Agent"}
              </Button>
            </DialogFooter>
          </form>
        ) : setup ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-md bg-critical-bg border border-[#fecaca] p-3 text-sm text-critical-text">
              Copy these values now. The API key will not be shown again.
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-text-secondary uppercase tracking-wide">RASP_AGENT_ID</Label>
                <div className="relative">
                  <div className="rounded-md bg-text-primary p-3 pr-10 font-mono text-xs text-border break-all">
                    {setup.agentId}
                  </div>
                  <button
                    onClick={() => handleCopy("agentId", setup.agentId)}
                    className="absolute right-2 top-2 rounded-sm p-1.5 text-text-muted hover:text-white transition-colors"
                  >
                    {copied.agentId
                      ? <Check size={16} className="text-success" />
                      : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {setup.rawKey && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-text-secondary uppercase tracking-wide">RASP_API_KEY</Label>
                  <div className="relative">
                    <div className="rounded-md bg-text-primary p-3 pr-10 font-mono text-xs text-border break-all">
                      {setup.rawKey}
                    </div>
                    <button
                      onClick={() => handleCopy("rawKey", setup.rawKey!)}
                      className="absolute right-2 top-2 rounded-sm p-1.5 text-text-muted hover:text-white transition-colors"
                    >
                      {copied.rawKey
                        ? <Check size={16} className="text-success" />
                        : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
