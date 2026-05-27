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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Agents" value={project.agents.length} icon={Server} iconColor="#2563eb" iconBg="#eff6ff" />
        <KpiCard title="Events" value={project._count.securityEvents} icon={ShieldAlert} iconColor="#dc2626" iconBg="#fef2f2" />
        <KpiCard title="Open Alerts" value={project._count.alerts} icon={ShieldAlert} iconColor="#ea580c" iconBg="#fff7ed" />
        <KpiCard title="Endpoints" value={project._count.discoveredEndpoints} icon={Webhook} iconColor="#16a34a" iconBg="#f0fdf4" />
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Agents ({project.agents.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({project._count.securityEvents})</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints ({project._count.discoveredEndpoints})</TabsTrigger>
          <TabsTrigger value="keys">API Keys ({project.apiKeys.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Version</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {project.agents.map((a) => (
                    <tr key={a.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3 font-mono text-xs text-[#475569]">{a.id.slice(0, 12)}…</td>
                      <td className="px-4 py-3 font-mono text-xs">{a.version}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.mode} /></td>
                      <td className="px-4 py-3 text-xs text-[#94a3b8]">{a.lastHeartbeatAt ? formatRelativeTime(a.lastHeartbeatAt) : "Never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Endpoint</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {project.securityEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3"><SeverityBadge severity={ev.severity} /></td>
                      <td className="px-4 py-3 font-mono text-xs">{ev.type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#475569]">{ev.method} {ev.path}</td>
                      <td className="px-4 py-3 text-xs text-[#94a3b8]">{formatRelativeTime(ev.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Path</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Auth</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {project.discoveredEndpoints.map((ep) => (
                    <tr key={ep.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3 font-mono text-xs font-bold">{ep.method}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#475569]">{ep.pathPattern}</td>
                      <td className="px-4 py-3 text-xs">{ep.authStatus}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${ep.riskScore >= 70 ? "text-[#dc2626]" : ep.riskScore >= 40 ? "text-[#d97706]" : "text-[#16a34a]"}`}>
                          {ep.riskScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-1">
                        {ep.isShadowApi && <span className="text-xs px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">Shadow</span>}
                        {ep.isZombieApi && <span className="text-xs px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">Zombie</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Prefix</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {project.apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3 text-sm">{k.name ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{k.prefix}…</td>
                      <td className="px-4 py-3 text-xs text-[#94a3b8]">{formatRelativeTime(k.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
