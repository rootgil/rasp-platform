import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMembership } from "@/modules/organizations/membership.server";
import { getRedactionPolicies } from "@/modules/redaction/redaction.server";
import { listProjectOptions } from "@/modules/projects/projects.server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScrollText, ShieldCheck, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RedactionPolicyDialog } from "./redaction-policy-dialog";

const MODE_DESCRIPTIONS: Record<string, string> = {
  denylist: "Strips known-sensitive patterns (email, passwords, tokens). Passes everything else. Maximizes forensic value.",
  allowlist: "Only sends explicitly approved fields. Drops everything else. Required for healthcare and financial environments.",
  "metadata-only": "Sends only event metadata (timestamp, attack type, severity). No payload data at all.",
  "local-only": "All telemetry stays on the customer's infrastructure. Agent writes to local log file only.",
};

export default async function RedactionPoliciesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const preferred = (session.user as { organizationId?: string }).organizationId;
  const membership = await getMembership(session.user.id, preferred);
  if (!membership) redirect("/login");
  const orgId = membership.organizationId;

  const [policies, projects] = await Promise.all([
    getRedactionPolicies(orgId),
    listProjectOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redaction Policies"
        description="Control what data leaves the customer environment"
        action={
          <RedactionPolicyDialog projects={projects}>
            <Button><Plus size={16} />New Policy</Button>
          </RedactionPolicyDialog>
        }
      />

      {/* Privacy principle card */}
      <Card className="border-[#bfdbfe] bg-brand-light">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-low-text">Scrub at the Source</p>
            <p className="text-sm text-brand mt-0.5">
              All sensitive data is redacted inside the RASP agent before any telemetry leaves the customer&apos;s environment.
              No PII, credentials, or regulated data transits the network to the control plane in cleartext.
              If redaction fails, the event is dropped - never sent with raw data.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{policy.project.name}</CardTitle>
                <p className="text-xs text-text-muted mt-1">Created {formatDate(policy.createdAt)}</p>
              </div>
              <StatusBadge status={policy.mode} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                {MODE_DESCRIPTIONS[policy.mode] ?? policy.mode}
              </p>
              {policy.rules && (
                <div className="rounded-md bg-text-primary p-3 overflow-auto max-h-32">
                  <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap">
                    {JSON.stringify(policy.rules, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Available modes info cards */}
        {["allowlist", "metadata-only", "local-only"]
          .filter((mode) => !policies.find((p) => p.mode === mode))
          .map((mode) => (
            <Card key={mode} className="border-dashed">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize">{mode}</CardTitle>
                  <ScrollText size={16} className="text-text-secondary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">{MODE_DESCRIPTIONS[mode]}</p>
                <RedactionPolicyDialog projects={projects} initial={{ mode }}>
                  <Button variant="secondary" size="sm" className="mt-4">Configure</Button>
                </RedactionPolicyDialog>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
