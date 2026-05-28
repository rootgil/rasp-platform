"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
};

type Rule = {
  id: string;
  name: string;
  type: string;
  severity: string;
  description: string | null;
  globalEnabled: boolean;
  projectEnabled: boolean;
  effectiveEnabled: boolean;
};

type Project = { id: string; name: string };

export function RulesClient({
  projects,
  activeProjectId,
  rules,
}: {
  projects: Project[];
  activeProjectId: string;
  rules: Rule[];
}) {
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);

  function handleProjectChange(projectId: string) {
    router.push(`?projectId=${projectId}`);
  }

  async function handleToggle(ruleId: string, enabled: boolean) {
    setToggling(ruleId);
    try {
      await fetch(`/api/projects/${activeProjectId}/rules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, enabled }),
      });
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  const enabledCount = rules.filter((r) => r.effectiveEnabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={activeProjectId} onValueChange={handleProjectChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select application…" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-text-secondary">
          {enabledCount} of {rules.length} rules active
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Rule</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Global</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Enabled for project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className={`transition-colors ${!rule.globalEnabled ? "opacity-50" : "hover:bg-background"}`}
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
                      <Badge variant={rule.globalEnabled ? "secondary" : "outline"}>
                        {rule.globalEnabled ? "on" : "off"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={rule.projectEnabled}
                        disabled={!rule.globalEnabled || toggling === rule.id}
                        onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                        aria-label={`Toggle ${rule.name}`}
                      />
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
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
