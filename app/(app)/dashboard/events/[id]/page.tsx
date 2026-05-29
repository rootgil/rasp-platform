import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getEvent } from "@/modules/events/events.server";
import { ShieldCheck } from "lucide-react";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const event = await getEvent(id, membership.organizationId);
  if (!event) notFound();

  const meta = (event.payload && typeof event.payload === "object")
    ? (event.payload as Record<string, unknown>)
    : null;

  const matchedValue = meta?.matchedValue as string | undefined;
  const matchedRule = meta?.matchedRule as string | undefined;
  const detectorDescription = meta?.detectorDescription as string | undefined;
  const auditLoggedLocally = meta?.auditLoggedLocally as boolean | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        description={`Event ID: ${event.id}`}
        action={<SeverityBadge severity={event.severity} />}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y divide-border">
              {[
                { label: "Type", value: event.type, mono: true },
                { label: "Severity", value: <SeverityBadge severity={event.severity} /> },
                { label: "Application", value: event.project.name },
                { label: "Method", value: event.method ?? "-", mono: true },
                { label: "Endpoint", value: event.path ?? "-", mono: true },
                { label: "Source IP", value: event.sourceIp ?? "-", mono: true },
                { label: "Action", value: <StatusBadge status={event.action} /> },
                { label: "Redacted", value: event.redacted ? "Yes" : "No" },
                { label: "Audit logged locally", value: auditLoggedLocally ? "Yes" : "No" },
                { label: "Detected at", value: formatDate(event.createdAt) },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-sm text-text-secondary">{label}</dt>
                  <dd className={`text-sm font-medium text-text-primary ${mono ? "font-mono" : ""}`}>
                    {value as React.ReactNode}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Detection</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {matchedRule && (
              <div>
                <p className="text-xs text-text-secondary mb-1">Detector</p>
                <p className="text-sm font-mono font-medium text-text-primary">{matchedRule}</p>
                {detectorDescription && (
                  <p className="text-xs text-text-muted mt-1">{detectorDescription}</p>
                )}
              </div>
            )}

            {matchedValue !== undefined && (
              <div>
                <p className="text-xs text-text-secondary mb-1">Matched value (redacted)</p>
                <div className="rounded-md bg-surface border border-border px-3 py-2">
                  <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap break-all">
                    {matchedValue ?? <span className="text-text-muted italic">empty</span>}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-success pt-1">
              <ShieldCheck size={13} />
              Payload scrubbed at source - no raw sensitive data transmitted
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Full payload (redacted)</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md bg-background border border-border p-4 overflow-auto max-h-72">
              <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {event.agent && (
          <Card>
            <CardHeader><CardTitle>Reporting Agent</CardTitle></CardHeader>
            <CardContent className="p-0">
              <dl className="divide-y divide-border">
                {[
                  { label: "Agent ID", value: event.agent.id, mono: true },
                  { label: "Language", value: event.agent.language },
                  { label: "Version", value: event.agent.version, mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3">
                    <dt className="text-sm text-text-secondary">{label}</dt>
                    <dd className={`text-sm font-medium text-text-primary ${mono ? "font-mono" : ""}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
