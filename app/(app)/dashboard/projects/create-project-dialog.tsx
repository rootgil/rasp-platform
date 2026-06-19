"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, ChevronLeft, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

interface CatalogueRule {
  id:             string;
  name:           string;
  type:           string;
  severity:       string;
  description:    string | null;
  yamlDefinition: string | null;
}

const SEVERITY_COLORS: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high:     "destructive",
  medium:   "secondary",
  low:      "outline",
};

export function CreateProjectDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [step, setStep]       = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogueRule[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [expandedYaml, setExpandedYaml]       = useState<string | null>(null);

  const [form, setForm] = useState({
    name:        "",
    language:    "",
    framework:   "",
    environment: "production",
  });

  useEffect(() => {
    if (open && step === 2 && catalogue.length === 0) {
      fetch("/api/rules")
        .then((r) => r.json())
        .then((data: CatalogueRule[]) => setCatalogue(data))
        .catch(() => {});
    }
  }, [open, step, catalogue.length]);

  function toggleAll() {
    if (selectedRuleIds.size === catalogue.length) {
      setSelectedRuleIds(new Set());
    } else {
      setSelectedRuleIds(new Set(catalogue.map((r) => r.id)));
    }
  }

  function toggleRule(id: string) {
    setSelectedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClose(v: boolean) {
    setOpen(v);
    if (!v) {
      setStep(1);
      setForm({ name: "", language: "", framework: "", environment: "production" });
      setSelectedRuleIds(new Set());
      setExpandedYaml(null);
    }
  }

  async function handleCreate() {
    setLoading(true);
    try {
      // Step 1: Create the project
      const projectRes = await fetch("/api/projects", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!projectRes.ok) {
        const d = await projectRes.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Failed to create application");
        return;
      }
      const project = await projectRes.json() as { id: string };

      // Step 2: Add selected catalogue rules
      await Promise.all(
        Array.from(selectedRuleIds).map((catalogueRuleId) =>
          fetch("/api/project-rules", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ source: "catalogue", projectId: project.id, catalogueRuleId }),
          })
        )
      );

      // Step 3: Publish initial policy v1
      await fetch("/api/project-rules/publish", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ projectId: project.id }),
      });

      handleClose(false);
      toast.success(`Application "${form.name}" created with ${selectedRuleIds.size} detection rule(s) active`);
      router.refresh();
    } catch {
      toast.error("Failed to create application");
    } finally {
      setLoading(false);
    }
  }

  const step1Valid = form.name.trim() !== "" && form.language !== "";
  const step2Valid = selectedRuleIds.size > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={step === 2 ? "max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Add Application" : "Choose Detection Rules"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Step 1 of 2 — Application details"
              : `Step 2 of 2 — Select at least one rule. Your agents won't detect anything until a rule is active.`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Application name</Label>
              <Input
                placeholder="billing-api"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="node">Node.js</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="dotnet">.NET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Framework</Label>
                <Input
                  placeholder="express"
                  value={form.framework}
                  onChange={(e) => setForm((f) => ({ ...f, framework: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select value={form.environment} onValueChange={(v) => setForm((f) => ({ ...f, environment: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                type="button"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
              >
                Next: Choose Rules <ChevronRight size={14} className="ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">{selectedRuleIds.size}</span> / {catalogue.length} rules selected
              </p>
              <Button type="button" variant="outline" size="sm" onClick={toggleAll} className="h-7 text-xs">
                {selectedRuleIds.size === catalogue.length ? "Deselect all" : "Select all"}
              </Button>
            </div>

            <div className="border border-border rounded-md divide-y divide-border max-h-[360px] overflow-y-auto">
              {catalogue.length === 0 && (
                <div className="p-6 text-center text-sm text-text-muted">Loading catalogue…</div>
              )}
              {catalogue.map((rule) => (
                <div key={rule.id} className="p-3 space-y-1.5">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`rule-${rule.id}`}
                      checked={selectedRuleIds.has(rule.id)}
                      onCheckedChange={() => toggleRule(rule.id)}
                      className="mt-0.5"
                    />
                    <label htmlFor={`rule-${rule.id}`} className="flex-1 cursor-pointer space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text-primary">{rule.name}</span>
                        <Badge variant={SEVERITY_COLORS[rule.severity] ?? "outline"} className="text-[10px] px-1.5 py-0">
                          {rule.severity}
                        </Badge>
                        <span className="text-xs text-text-muted">{rule.type.replace(/_/g, " ")}</span>
                      </div>
                      {rule.description && (
                        <p className="text-xs text-text-secondary">{rule.description}</p>
                      )}
                    </label>
                    {rule.yamlDefinition && (
                      <button
                        type="button"
                        className="text-text-muted hover:text-text-primary transition-colors shrink-0"
                        onClick={() => setExpandedYaml(expandedYaml === rule.id ? null : rule.id)}
                        aria-label="Toggle YAML"
                      >
                        {expandedYaml === rule.id
                          ? <ChevronUp size={14} />
                          : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                  {expandedYaml === rule.id && rule.yamlDefinition && (
                    <pre className="ml-7 p-2 rounded bg-background border border-border text-[10px] font-mono overflow-x-auto max-h-32 text-text-primary">
                      {rule.yamlDefinition}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            {!step2Valid && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <ShieldCheck size={12} />
                Select at least one rule — your application will have no protection otherwise.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                <ChevronLeft size={14} className="mr-1" /> Back
              </Button>
              <Button type="button" disabled={loading || !step2Valid} onClick={handleCreate}>
                {loading ? "Creating…" : `Create Application (${selectedRuleIds.size} rule${selectedRuleIds.size !== 1 ? "s" : ""})`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
