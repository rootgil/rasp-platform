import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getMembership } from "@/modules/organizations/membership.server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { CopyButton } from "@/components/shared/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getPolicy, getLatestPolicy } from "@/modules/policies/policies.server";
import { PolicyRollbackButton } from "../policy-rollback-button";
import { ArrowLeft, ShieldCheck } from "lucide-react";

function JsonSection({ title, data }: { title: string; data: unknown }) {
  if (data == null) return null;
  return (
    <Card className="md:col-span-2">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="rounded-md bg-background border border-border p-4 overflow-auto max-h-72">
          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const preferred = (session.user as { organizationId?: string }).organizationId;
  const membership = await getMembership(session.user.id, preferred);
  if (!membership) redirect("/login");
  const orgId = membership.organizationId;

  const policy = await getPolicy(id, orgId);
  if (!policy) notFound();

  const latest = await getLatestPolicy(orgId, policy.projectId, policy.channel);
  const isLatest = latest?.version === policy.version;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/policies"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand transition-colors"
      >
        <ArrowLeft size={14} />
        Back to policies
      </Link>

      <PageHeader
        title={`Policy v${policy.version}`}
        description={policy.project.name}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {isLatest && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-light text-brand font-medium">
                latest
              </span>
            )}
            <StatusBadge status={policy.mode} />
            {!isLatest && (
              <PolicyRollbackButton
                projectId={policy.projectId}
                targetVersion={policy.version}
              />
            )}
          </div>
        }
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Policy Details</CardTitle></CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y divide-border">
              {[
                { label: "Application", value: policy.project.name },
                { label: "Version", value: `v${policy.version}`, mono: true },
                { label: "Channel", value: policy.channel },
                { label: "Mode", value: <StatusBadge status={policy.mode} /> },
                { label: "Agent version", value: policy.targetAgentVersion ?? "-", mono: true },
                {
                  label: "Signing key",
                  value: policy.signingKeyId ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <ShieldCheck size={12} />
                      {policy.signingKeyId}
                    </span>
                  ) : "-",
                },
                { label: "Created", value: formatDate(policy.createdAt) },
                {
                  label: "Policy ID",
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      {policy.id}
                      <CopyButton value={policy.id} />
                    </span>
                  ),
                  mono: true,
                },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3 gap-4">
                  <dt className="text-sm text-text-secondary shrink-0">{label}</dt>
                  <dd className={`text-sm font-medium text-text-primary text-right ${mono ? "font-mono" : ""}`}>
                    {value as React.ReactNode}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Signature</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md bg-background border border-border p-4 overflow-auto max-h-72">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-text-secondary">Ed25519 signature (base64)</p>
                <CopyButton value={policy.signature} />
              </div>
              <pre className="text-xs text-text-secondary whitespace-pre-wrap break-all font-mono">
                {policy.signature}
              </pre>
            </div>
          </CardContent>
        </Card>

        <JsonSection title="Detection rules" data={policy.detectionRules} />
        <JsonSection title="Redaction config" data={policy.redactionConfig} />
        <JsonSection title="Data residency" data={policy.dataResidency} />
      </div>
    </div>
  );
}
