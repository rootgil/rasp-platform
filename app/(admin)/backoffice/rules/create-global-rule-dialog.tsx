"use client";

import { useState, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const YAML_TEMPLATE = `name: My Detection Rule
type: custom_rule
severity: medium
target: any
pattern: "(keyword1|keyword2|keyword3)"
description: Describe what this rule detects
enabled: true`;

interface ParsedPreview {
  id:          string;
  name:        string;
  type:        string;
  severity:    string;
  target:      string;
  pattern:     string;
  description?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "destructive",
  high:     "destructive",
  medium:   "secondary",
  low:      "outline",
};

function parseYamlPreview(text: string): { preview: ParsedPreview; error: null } | { preview: null; error: string } {
  try {
    const lines = text.split("\n");
    const obj: Record<string, string> = {};
    for (const line of lines) {
      const m = line.match(/^(\w+):\s*"?([^"#\n]*)"?\s*(?:#.*)?$/);
      if (m) obj[m[1].trim()] = m[2].trim();
    }
    if (!obj.name)    return { preview: null, error: "name is required" };
    if (!obj.type)    return { preview: null, error: "type is required" };
    if (!obj.severity) return { preview: null, error: "severity is required" };
    if (!obj.target)  return { preview: null, error: "target is required" };
    if (!obj.pattern) return { preview: null, error: "pattern is required" };

    // Validate regex
    try { new RegExp(obj.pattern); } catch {
      return { preview: null, error: "pattern is not a valid regular expression" };
    }

    const derivedId = (obj.id || obj.name).trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
    return {
      preview: {
        id:          derivedId,
        name:        obj.name,
        type:        obj.type,
        severity:    obj.severity,
        target:      obj.target,
        pattern:     obj.pattern,
        description: obj.description,
      },
      error: null,
    };
  } catch {
    return { preview: null, error: "Invalid YAML" };
  }
}

export function CreateGlobalRuleDialog({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [yaml, setYaml]     = useState(YAML_TEMPLATE);

  const parsed = parseYamlPreview(yaml);

  const handleOpen = useCallback((v: boolean) => {
    setOpen(v);
    if (v) setYaml(YAML_TEMPLATE);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.preview) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:           parsed.preview.id,
          type:           parsed.preview.type,
          severity:       parsed.preview.severity,
          description:    parsed.preview.description,
          pattern:        parsed.preview.pattern,
          target:         parsed.preview.target,
          yamlDefinition: yaml,
          enabled:        true,
        }),
      });
      if (res.ok) {
        setOpen(false);
        toast.success(`Rule "${parsed.preview.name}" created — projects will be notified`);
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

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Global Detection Rule</DialogTitle>
          <DialogDescription>
            Define the rule in YAML. It will be added to the catalogue and all existing projects will receive an opt-in notification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rule definition (YAML)</span>
              {parsed.error ? (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle size={12} /> {parsed.error}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle2 size={12} /> Valid
                </span>
              )}
            </div>
            <Textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              rows={12}
              className="font-mono text-xs resize-none"
              spellCheck={false}
            />
            <div className="rounded-md bg-background border border-border px-3 py-2 space-y-1">
              <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Pattern examples (JavaScript regex)</p>
              <div className="grid grid-cols-1 gap-0.5 font-mono text-[11px] text-text-muted">
                <span><span className="text-text-secondary">SQL Injection</span>   <span className="text-brand">(union\s+select|drop\s+table|sleep\s*\()</span></span>
                <span><span className="text-text-secondary">XSS              </span><span className="text-brand">(&lt;script[\s&gt;]|javascript:|on\w+\s*=)</span></span>
                <span><span className="text-text-secondary">Path Traversal   </span><span className="text-brand">(\.\./|/etc/passwd|%2e%2e%2f)</span></span>
                <span><span className="text-text-secondary">Keyword match    </span><span className="text-brand">(keyword1|keyword2)</span></span>
              </div>
              <p className="text-[11px] text-text-muted pt-0.5">Use standard JavaScript regex syntax. For case-insensitive matching, use character classes: <span className="font-mono">[Ss][Qq][Ll]</span> or bracket alternatives.</p>
            </div>
          </div>

          {parsed.preview && (
            <div className="rounded-md border border-border p-3 space-y-1.5 bg-background">
              <p className="text-xs font-medium text-text-secondary uppercase">Preview</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold">{parsed.preview.name}</span>
                <Badge variant={(SEVERITY_COLORS[parsed.preview.severity] ?? "outline") as "destructive" | "secondary" | "outline"}>
                  {parsed.preview.severity}
                </Badge>
                <span className="text-xs text-text-muted">{parsed.preview.type}</span>
                <span className="text-xs text-text-muted">target: {parsed.preview.target}</span>
              </div>
              {parsed.preview.description && (
                <p className="text-xs text-text-muted">{parsed.preview.description}</p>
              )}
              <p className="font-mono text-xs text-text-secondary break-all">
                pattern: {parsed.preview.pattern}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !parsed.preview}>
              {loading ? "Creating…" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
