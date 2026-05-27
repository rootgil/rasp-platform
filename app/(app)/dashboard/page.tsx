import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, ShieldAlert, Ban, ScrollText, Boxes } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { DashboardCharts } from "./dashboard-charts";
import Link from "next/link";

async function getDashboardData(organizationId: string) {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    projectCount,
    agentCount,
    onlineAgents,
    criticalEvents24h,
    blockedAttacks,
    recentEvents,
    eventsByDay,
    bySeverity,
    topEndpoints,
  ] = await Promise.all([
    prisma.project.count({ where: { organizationId } }),
    prisma.agent.count({ where: { project: { organizationId } } }),
    prisma.agent.count({ where: { project: { organizationId }, status: "online" } }),
    prisma.securityEvent.count({
      where: { project: { organizationId }, severity: { in: ["critical", "high"] }, createdAt: { gte: since24h } },
    }),
    prisma.securityEvent.count({ where: { project: { organizationId }, action: "block" } }),
    prisma.securityEvent.findMany({
      where: { project: { organizationId } },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.securityEvent.findMany({
      where: { project: { organizationId }, createdAt: { gte: since7d } },
      select: { createdAt: true, severity: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.securityEvent.groupBy({
      by: ["severity"],
      where: { project: { organizationId } },
      _count: true,
    }),
    prisma.securityEvent.groupBy({
      by: ["path"],
      where: { project: { organizationId } },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 5,
    }),
  ]);

  // Build daily chart data (last 7 days)
  const days: Record<string, { date: string; critical: number; high: number; medium: number; low: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    days[key] = { date: key, critical: 0, high: 0, medium: 0, low: 0 };
  }
  for (const ev of eventsByDay) {
    const key = ev.createdAt.toISOString().slice(0, 10);
    if (days[key]) {
      const sev = ev.severity as keyof (typeof days)[string];
      if (sev in days[key]) days[key][sev]++;
    }
  }

  return {
    projectCount,
    agentCount,
    onlineAgents,
    criticalEvents24h,
    blockedAttacks,
    recentEvents,
    chartData: Object.values(days),
    severityData: bySeverity.map((s) => ({ name: s.severity, value: s._count })),
    topEndpoints: topEndpoints.map((e) => ({ path: e.path ?? "unknown", count: e._count.path })),
  };
}

export default async function DashboardPage() {
  const session = await auth();

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session?.user?.id },
    include: { organization: true },
  });
  if (!membership) redirect("/login");

  const data = await getDashboardData(membership.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Overview"
        description={`${membership.organization.name} · Production`}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Protected Apps"
          value={data.projectCount}
          icon={Boxes}
          iconColor="#2563eb"
          iconBg="#eff6ff"
        />
        <KpiCard
          title="Active Agents"
          value={`${data.onlineAgents}/${data.agentCount}`}
          icon={Server}
          iconColor="#16a34a"
          iconBg="#f0fdf4"
        />
        <KpiCard
          title="Critical Events 24h"
          value={data.criticalEvents24h}
          icon={ShieldAlert}
          iconColor="#dc2626"
          iconBg="#fef2f2"
        />
        <KpiCard
          title="Blocked Attacks"
          value={data.blockedAttacks}
          icon={Ban}
          iconColor="#ea580c"
          iconBg="#fff7ed"
        />
        <KpiCard
          title="Redacted Payloads"
          value="100%"
          icon={ScrollText}
          iconColor="#d97706"
          iconBg="#fffbeb"
          delta="All events scrubbed at source"
          deltaPositive
        />
      </div>

      {/* Charts Row */}
      <DashboardCharts chartData={data.chartData} severityData={data.severityData} />

      {/* Bottom Row: Recent Events + Top Endpoints */}
      <div className="grid xl:grid-cols-3 gap-4">
        {/* Recent Events */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle>Recent Events</CardTitle>
            <Link
              href="/dashboard/events"
              className="text-xs text-brand hover:underline font-medium"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary uppercase">Severity</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Application</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Endpoint</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary uppercase">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-background transition-colors">
                    <td className="px-5 py-3">
                      <SeverityBadge severity={ev.severity} />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-text-primary">
                      {ev.type.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 text-text-secondary hidden md:table-cell">
                      {ev.project.name}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-text-secondary hidden lg:table-cell truncate max-w-[180px]">
                      {ev.method} {ev.path}
                    </td>
                    <td className="px-5 py-3 text-xs text-text-muted">
                      {formatRelativeTime(ev.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top Attacked Endpoints */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Top Attacked Endpoints</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {data.topEndpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono text-text-muted w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-text-primary truncate">{ep.path ?? "/"}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-border-light overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{
                        width: `${Math.round((ep.count / (data.topEndpoints[0]?.count || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-text-secondary shrink-0">{ep.count}</span>
              </div>
            ))}
            {data.topEndpoints.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">No events yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
