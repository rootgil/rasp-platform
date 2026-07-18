"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

export function CreateApiKeyDialog({
  children,
  projects,
}: {
  children: React.ReactNode;
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "key">("form");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rawKey, setRawKey] = useState("");
  const [form, setForm] = useState({ projectId: "", name: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setRawKey(data.rawKey);
        setStep("key");
        toast.success("Clé API générée");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Failed to generate API key");
      }
    } catch {
      toast.error("Failed to generate API key");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(rawKey);
    if (!ok) {
      toast.error("Copy failed — select the value and press Ctrl+C");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => { setStep("form"); setRawKey(""); setForm({ projectId: "", name: "" }); }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step === "form" ? "Generate API Key" : "Copy your API key"}</DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Application</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))} required>
                <SelectTrigger><SelectValue placeholder="Select application…" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Key name (optional)</Label>
              <Input placeholder="Production server" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={loading || !form.projectId}>{loading ? "Generating…" : "Generate"}</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-md bg-critical-bg border border-[#fecaca] p-3 text-sm text-critical-text">
              Copy this key now. It will not be shown again.
            </div>
            <div className="relative">
              <div className="rounded-md bg-text-primary p-3 pr-10 font-mono text-xs text-border break-all">
                {rawKey}
              </div>
              <button
                onClick={handleCopy}
                className="absolute right-2 top-2 rounded-sm p-1.5 text-text-muted hover:text-white transition-colors"
              >
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
