import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const event = await prisma.securityEvent.findFirst({
    where: { id, project: { organizationId: membership.organizationId } },
    include: { project: true, agent: { select: { id: true, language: true, version: true } } },
  });
  if (!event) notFound();

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
          <CardHeader><CardTitle>Payload (redacted)</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md bg-text-primary p-4 overflow-auto max-h-64">
              <pre className="text-xs text-text-muted whitespace-pre-wrap font-mono">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              Payload scrubbed at source - no raw sensitive data transmitted
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
