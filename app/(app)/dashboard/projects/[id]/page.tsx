import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, ShieldAlert, Webhook } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { CopyButton } from "@/components/shared/copy-button";
import { DeleteProjectButton } from "./delete-project-button";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: {
      agents: { orderBy: { createdAt: "desc" } },
      apiKeys: { where: { revoked: false }, orderBy: { createdAt: "desc" } },
      securityEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      discoveredEndpoints: { orderBy: { riskScore: "desc" }, take: 10 },
      _count: { select: { securityEvents: true, alerts: true, discoveredEndpoints: true } },
    },
  });

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`${project.language}${project.framework ? ` · ${project.framework}` : ""} · ${project.environment}`}
      />
      <div className="flex items-center gap-1.5 -mt-3 font-mono text-xs text-text-muted">
        <span>{project.id}</span>
        <CopyButton value={project.id} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Agents" value={project.agents.length} icon={Server} iconColor="#2563eb" iconBg="#eff6ff" />
        <KpiCard title="Events" value={project._count.securityEvents} icon={ShieldAlert} iconColor="#dc2626" iconBg="#fef2f2" />
        <KpiCard title="Open Alerts" value={project._count.alerts} icon={ShieldAlert} iconColor="#ea580c" iconBg="#fff7ed" />
        <KpiCard title="Endpoints" value={project._count.discoveredEndpoints} icon={Webhook} iconColor="#16a34a" iconBg="#f0fdf4" />
      </div>

      <Tabs defaultValue="agents">
        <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="agents">Agents ({project.agents.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({project._count.securityEvents})</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints ({project._count.discoveredEndpoints})</TabsTrigger>
          <TabsTrigger value="keys">API Keys ({project.apiKeys.length})</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="agents">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[280px]">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Version</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {project.agents.map((a) => (
                    <tr key={a.id} className="hover:bg-background">
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary hidden sm:table-cell">
                        <span className="flex items-center gap-1">
                          {a.id.slice(0, 12)}…
                          <CopyButton value={a.id} />
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs hidden md:table-cell">{a.version}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={a.mode} /></td>
                      <td className="px-4 py-3 text-xs text-text-muted">{a.lastHeartbeatAt ? formatRelativeTime(a.lastHeartbeatAt) : "Never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[280px]">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Endpoint</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {project.securityEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-background">
                      <td className="px-4 py-3"><SeverityBadge severity={ev.severity} /></td>
                      <td className="px-4 py-3 font-mono text-xs">{ev.type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary hidden md:table-cell">{ev.method} {ev.path}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{formatRelativeTime(ev.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[280px]">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Path</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Auth</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {project.discoveredEndpoints.map((ep) => (
                    <tr key={ep.id} className="hover:bg-background">
                      <td className="px-4 py-3 font-mono text-xs font-bold">{ep.method}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{ep.pathPattern}</td>
                      <td className="px-4 py-3 text-xs hidden sm:table-cell">{ep.authStatus}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${ep.riskScore >= 70 ? "text-critical" : ep.riskScore >= 40 ? "text-medium" : "text-success"}`}>
                          {ep.riskScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex gap-1">
                          {ep.isShadowApi && <span className="text-xs px-2 py-0.5 rounded-full bg-critical-bg text-critical-text border border-[#fecaca]">Shadow</span>}
                          {ep.isZombieApi && <span className="text-xs px-2 py-0.5 rounded-full bg-medium-bg text-medium-text border border-[#fde68a]">Zombie</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[200px]">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Prefix</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {project.apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-background">
                      <td className="px-4 py-3 text-sm">{k.name ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs hidden sm:table-cell">{k.prefix}…</td>
                      <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell">{formatRelativeTime(k.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteProjectButton projectId={project.id} projectName={project.name} />
    </div>
  );
}
