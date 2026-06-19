"use client";

import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { compileRuleYaml } from "@/modules/project-rules/yaml-compiler";
import {
  RULE_YAML_FIELDS,
  humanizeCompileError,
} from "@/modules/project-rules/rule-yaml-help";

const SEV_COLORS: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high:     "destructive",
  medium:   "secondary",
  low:      "outline",
};

export function RuleYamlEditor({
  yaml,
  onChange,
  rows = 8,
  showFieldGuide = true,
}: {
  yaml:             string;
  onChange:         (value: string) => void;
  rows?:            number;
  showFieldGuide?:  boolean;
}) {
  const result = compileRuleYaml(yaml);
  const valid  = !("errors" in result);

  return (
    <div className="space-y-2">
      {showFieldGuide && (
        <details className="rounded-md border border-border bg-background group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs text-text-secondary [&::-webkit-details-marker]:hidden">
            <span>
              <span className="font-medium text-text-primary">Help</span>
              {" - "}
              required: name, type, severity, target, pattern · use single quotes for regex
            </span>
            <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border px-3 py-2 space-y-2">
            <dl className="space-y-1">
              {RULE_YAML_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-[4.5rem_1fr] gap-x-2 text-[11px]">
                  <dt className="font-mono text-text-secondary shrink-0">
                    {field.key}
                    {field.required && <span className="text-destructive">*</span>}
                  </dt>
                  <dd className="text-text-muted min-w-0">
                    {field.description}
                    {"hint" in field && field.hint && (
                      <span className="text-text-muted/80"> · {field.hint}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-text-muted border-t border-border pt-2">
              Pattern: wrap in <span className="font-mono text-text-secondary">single quotes</span>, e.g.{" "}
              <span className="font-mono text-brand">pattern: &apos;(/etc/passwd|win\.ini)&apos;</span>
              {" "}· JS regex, no <span className="font-mono">(?i)</span>
            </p>
          </div>
        </details>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-text-primary">YAML</span>
          {valid ? (
            <span className="flex items-center gap-1 text-xs text-success shrink-0">
              <CheckCircle2 size={12} /> Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-destructive shrink-0">
              <AlertCircle size={12} /> {result.errors.length} issue{result.errors.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Textarea
          value={yaml}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="font-mono text-xs resize-none"
          spellCheck={false}
          aria-invalid={!valid}
        />
        {valid && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-text-muted pt-0.5">
            <span className="font-medium text-text-secondary">{result.spec.name}</span>
            <Badge variant={SEV_COLORS[result.spec.severity] ?? "outline"} className="text-[10px] px-1 py-0">
              {result.spec.severity}
            </Badge>
            <span>{result.yaml.type}</span>
            <span>target: {result.spec.target}</span>
          </div>
        )}
      </div>

      {!valid && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-1"
        >
          <ul className="space-y-1">
            {result.errors.map((err, i) => (
              <li key={`${err.field}-${i}`} className="flex gap-2 text-xs text-destructive/90">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>{humanizeCompileError(err)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Whether the YAML is valid for save/submit. */
export function isRuleYamlValid(yaml: string): boolean {
  return !("errors" in compileRuleYaml(yaml));
}
