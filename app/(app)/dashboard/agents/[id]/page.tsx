import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) redirect("/login");

  const agent = await prisma.agent.findFirst({
    where: { id, project: { organizationId: membership.organizationId } },
    include: { project: { select: { name: true } } },
  });
  if (!agent) notFound();

  const rows = [
    { label: "Agent ID", value: agent.id, mono: true },
    { label: "Application", value: agent.project.name },
    { label: "Language", value: agent.language },
    { label: "Framework", value: agent.framework ?? "-" },
    { label: "Version", value: agent.version, mono: true },
    { label: "Channel", value: agent.channel },
    { label: "Mode", value: agent.mode },
    { label: "Kill Switch", value: agent.killSwitch ? "ENABLED" : "Disabled" },
    { label: "Last Heartbeat", value: agent.lastHeartbeatAt ? formatDate(agent.lastHeartbeatAt) : "Never" },
    { label: "Created", value: formatDate(agent.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Agent ${agent.id.slice(0, 12)}…`}
        description={agent.project.name}
        action={<StatusBadge status={agent.status} />}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Agent Details</CardTitle></CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y divide-border">
              {rows.map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-sm text-text-secondary">{label}</dt>
                  <dd className={`text-sm font-medium text-text-primary ${mono ? "font-mono" : ""}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-success mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Agent registered</p>
                  <p className="text-xs text-text-muted">{formatDate(agent.createdAt)}</p>
                </div>
              </div>
              {agent.lastHeartbeatAt && (
                <div className="flex items-start gap-3">
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${agent.status === "online" ? "bg-success" : "bg-text-muted"}`} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">Last heartbeat</p>
                    <p className="text-xs text-text-muted">{formatDate(agent.lastHeartbeatAt)}</p>
                  </div>
                </div>
              )}
              {agent.killSwitch && (
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-critical mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-critical">Kill switch active</p>
                    <p className="text-xs text-text-muted">Agent will self-disable on next heartbeat</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
