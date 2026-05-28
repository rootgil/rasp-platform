"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MODES = ["denylist", "allowlist", "metadata-only", "local-only"] as const;
const IP_MODES = ["hash", "mask", "passthrough"] as const;

/**
 * Create/update a redaction policy AND publish it as a signed policy that is
 * pushed to agents on their next heartbeat.
 */
export function RedactionPolicyDialog({
  children,
  projects,
  initial,
}: {
  children: React.ReactNode;
  projects: { id: string; name: string }[];
  initial?: { mode?: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: "",
    mode: (initial?.mode as (typeof MODES)[number]) ?? "denylist",
    customKeyPatterns: "",
    allowKeyPatterns: "",
    valueRedaction: true,
    ipMode: "hash" as (typeof IP_MODES)[number],
  });

  function lines(s: string): string[] {
    return s.split("\n").map((l) => l.trim()).filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const rules = {
        customKeyPatterns: lines(form.customKeyPatterns),
        allowKeyPatterns: lines(form.allowKeyPatterns),
        valueRedaction: form.valueRedaction,
        ipMode: form.ipMode,
      };
      const res = await fetch("/api/redaction-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: form.projectId, mode: form.mode, rules }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save policy");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redaction policy</DialogTitle>
        </DialogHeader>
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
            <Label>Mode</Label>
            <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v as (typeof MODES)[number] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Custom field patterns (denylist, one regex per line)</Label>
            <Textarea
              rows={3}
              placeholder={"internal_customer_id\nbusiness_ref_\\d+"}
              value={form.customKeyPatterns}
              onChange={(e) => setForm((f) => ({ ...f, customKeyPatterns: e.target.value }))}
            />
          </div>

          {form.mode === "allowlist" && (
            <div className="space-y-1.5">
              <Label>Allowed field patterns (one regex per line)</Label>
              <Textarea
                rows={3}
                placeholder={"^order_id$\n^status$"}
                value={form.allowKeyPatterns}
                onChange={(e) => setForm((f) => ({ ...f, allowKeyPatterns: e.target.value }))}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Value-based redaction (Luhn, SIN, email, health IDs)</Label>
            <Switch
              checked={form.valueRedaction}
              onCheckedChange={(v) => setForm((f) => ({ ...f, valueRedaction: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>IP handling</Label>
            <Select value={form.ipMode} onValueChange={(v) => setForm((f) => ({ ...f, ipMode: v as (typeof IP_MODES)[number] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IP_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-critical-text">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !form.projectId}>
              {loading ? "Publishing…" : "Save & publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
