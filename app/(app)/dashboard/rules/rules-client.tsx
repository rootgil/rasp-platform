"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const TYPE_LABELS: Record<string, string> = {
  sql_injection:      "SQL Injection",
  nosql_injection:    "NoSQL Injection",
  path_traversal:     "Path Traversal",
  command_injection:  "Command Injection",
  xss:                "XSS",
  xxe:                "XXE",
  ssrf:               "SSRF",
  template_injection: "Template Injection (SSTI)",
  bola_idor:          "BOLA / IDOR",
  brute_force:        "Brute Force",
  deserialization:    "Deserialization",
  suspicious_payload: "Suspicious Payload",
  prototype_pollution: "Prototype Pollution",
  suspicious_headers: "Suspicious Headers",
};

type Rule = {
  id: string;
  name: string;
  type: string;
  severity: string;
  description: string | null;
  enabled: boolean;
};

export function RulesClient({ rules }: { rules: Rule[] }) {
  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        {activeCount} of {rules.length} rules active
      </p>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Rule</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className={`transition-colors ${!rule.enabled ? "opacity-50" : "hover:bg-background"}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-medium text-text-primary">{rule.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {TYPE_LABELS[rule.type] ?? rule.type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={SEVERITY_VARIANT[rule.severity] ?? "outline"}>
                        {rule.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell max-w-xs truncate">
                      {rule.description ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={rule.enabled ? "secondary" : "outline"}>
                        {rule.enabled ? "active" : "disabled"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                      No rules in the catalogue yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
