"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BackofficeRuleActions } from "./backoffice-rule-actions";

const TYPE_LABELS: Record<string, string> = {
  sql_injection:         "SQL Injection",
  nosql_injection:       "NoSQL Injection",
  path_traversal:        "Path Traversal",
  command_injection:     "Command Injection",
  xss:                   "XSS",
  xxe:                   "XXE",
  ssrf:                  "SSRF",
  template_injection:    "Template Injection (SSTI)",
  prototype_pollution:   "Prototype Pollution",
  bola:                  "BOLA / IDOR",
  bola_idor:             "BOLA / IDOR",
  suspicious_headers:    "Suspicious Headers",
  host_header_injection: "Host Header Injection",
  header_injection:      "Header Injection (CRLF)",
  brute_force:           "Brute Force",
  deserialization:       "Deserialization",
  suspicious_payload:    "Suspicious Payload",
  custom_rule:           "Custom Rule",
};

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high:     "destructive",
  medium:   "secondary",
  low:      "outline",
};

interface Rule {
  id:             string;
  name:           string;
  type:           string;
  severity:       string;
  description:    string | null;
  enabled:        boolean;
  yamlDefinition: string | null;
  createdAt:      Date;
}

export function BackofficeRulesTable({ rules }: { rules: Rule[] }) {
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [copiedId, setCopiedId]       = useState<string | null>(null);

  const copyYaml = useCallback((ruleId: string, yaml: string) => {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopiedId(ruleId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="bg-background border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Rule</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Severity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Created</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rules.map((rule) => {
            const isExpanded = expandedId === rule.id;
            return (
              <>
                <tr key={rule.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{rule.name}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {TYPE_LABELS[rule.type] ?? rule.type}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={SEVERITY_VARIANT[rule.severity] ?? "outline"}>
                      {rule.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell max-w-xs truncate">
                    {rule.description ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {rule.enabled ? <StatusBadge status="active" /> : <StatusBadge status="offline" />}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell">
                    {formatDate(rule.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {rule.yamlDefinition && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-text-muted hover:text-text-primary"
                          onClick={() => toggle(rule.id)}
                          aria-label={isExpanded ? "Hide YAML" : "View YAML"}
                          title={isExpanded ? "Hide YAML" : "View YAML"}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </Button>
                      )}
                      <BackofficeRuleActions ruleId={rule.id} enabled={rule.enabled} />
                    </div>
                  </td>
                </tr>
                {isExpanded && rule.yamlDefinition && (
                  <tr key={`${rule.id}-yaml`} className="bg-background">
                    <td colSpan={7} className="px-6 pb-4 pt-4">
                      <div className="rounded-md border border-border overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-background border-b border-border">
                          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">
                            YAML Definition - {rule.name}
                          </span>
                          <button
                            className="text-[11px] transition-colors"
                            style={{ color: copiedId === rule.id ? "var(--color-success, #16a34a)" : undefined }}
                            onClick={() => copyYaml(rule.id, rule.yamlDefinition!)}
                          >
                            {copiedId === rule.id ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <pre className="p-4 text-[11px] font-mono leading-relaxed text-text-primary overflow-x-auto max-h-64">
                          {rule.yamlDefinition}
                        </pre>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          {rules.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                No rules in the catalogue. Add the first one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
