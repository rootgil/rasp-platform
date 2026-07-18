import { notFound } from "next/navigation";
import { getProjectAdmin } from "@/modules/projects/projects.server";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, ShieldAlert, Webhook } from "lucide-react";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function BackofficeProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await getProjectAdmin(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[30px] font-bold leading-9 tracking-tight text-text-primary">{project.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          <Link href={`/backoffice/organizations/${project.organizationId}`} className="text-brand hover:underline">
            {project.organization.name}
          </Link>
          {" · "}
          {project.language}
          {project.framework ? ` · ${project.framework}` : ""}
          {" · "}
          {project.environment}
        </p>
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
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary hidden sm:table-cell">{a.id.slice(0, 12)}…</td>
                        <td className="px-4 py-3 font-mono text-xs hidden md:table-cell">{a.version}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={a.mode} /></td>
                        <td className="px-4 py-3 text-xs text-text-muted">{a.lastHeartbeatAt ? formatRelativeTime(a.lastHeartbeatAt) : "Never"}</td>
                      </tr>
                    ))}
                    {project.agents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-text-muted">No agents</td>
                      </tr>
                    )}
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
                    {project.securityEvents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-text-muted">No events</td>
                      </tr>
                    )}
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
                    {project.discoveredEndpoints.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-text-muted">No endpoints</td>
                      </tr>
                    )}
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
                        <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell">{formatDate(k.createdAt)}</td>
                      </tr>
                    ))}
                    {project.apiKeys.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-sm text-text-muted">No API keys</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
