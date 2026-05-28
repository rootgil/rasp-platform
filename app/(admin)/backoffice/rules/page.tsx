import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CreateGlobalRuleDialog } from "./create-global-rule-dialog";
import { BackofficeRuleActions } from "./backoffice-rule-actions";

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

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export default async function BackofficeRulesPage() {
  const rules = await prisma.rule.findMany({
    orderBy: { createdAt: "asc" },
  });

  const active    = rules.filter((r) => r.enabled).length;
  const inactive  = rules.filter((r) => !r.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detection Rules - Global Catalogue"
        description={`${rules.length} rules · ${active} globally enabled · ${inactive} disabled`}
        action={
          <CreateGlobalRuleDialog>
            <Button size="sm"><Plus size={14} />New Rule</Button>
          </CreateGlobalRuleDialog>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary uppercase mb-1">Total Rules</p>
            <p className="text-2xl font-bold text-text-primary">{rules.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary uppercase mb-1">Globally Enabled</p>
            <p className="text-2xl font-bold text-brand">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary uppercase mb-1">Globally Disabled</p>
            <p className="text-2xl font-bold text-text-muted">{inactive}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
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
                {rules.map((rule) => (
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
                      {rule.enabled ? (
                        <StatusBadge status="active" />
                      ) : (
                        <StatusBadge status="offline" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell">
                      {formatDate(rule.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <BackofficeRuleActions ruleId={rule.id} enabled={rule.enabled} />
                    </td>
                  </tr>
                ))}
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
        </CardContent>
      </Card>
    </div>
  );
}
