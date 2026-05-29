"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RULE_TYPES = [
  { value: "sql_injection",      label: "SQL Injection" },
  { value: "nosql_injection",    label: "NoSQL Injection" },
  { value: "path_traversal",     label: "Path Traversal" },
  { value: "command_injection",  label: "Command Injection" },
  { value: "xss",                label: "XSS" },
  { value: "xxe",                label: "XXE" },
  { value: "ssrf",               label: "SSRF" },
  { value: "template_injection", label: "Template Injection (SSTI)" },
  { value: "bola_idor",          label: "BOLA / IDOR" },
  { value: "brute_force",        label: "Brute Force / Credential Stuffing" },
  { value: "deserialization",    label: "Deserialization" },
  { value: "suspicious_payload", label: "Suspicious Payload" },
];

export function CreateGlobalRuleDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "",
    severity: "medium" as "critical" | "high" | "medium" | "low",
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ name: "", type: "", severity: "medium", description: "" });
        toast.success(`Règle "${form.name}" créée`);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Failed to create rule");
      }
    } catch {
      toast.error("Failed to create rule");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = form.name && form.type;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Global Detection Rule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Rule name</Label>
            <Input
              placeholder="SQLI_CUSTOM_001"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Detection type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select
              value={form.severity}
              onValueChange={(v) => setForm((f) => ({ ...f, severity: v as typeof form.severity }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description <span className="text-text-muted">(optional)</span></Label>
            <Textarea
              placeholder="Describe what this rule detects…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !canSubmit}>
              {loading ? "Creating…" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
