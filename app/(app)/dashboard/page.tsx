import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMembership, getUserOnboardedAt } from "@/modules/organizations/membership.server";
import { getDashboardOverview } from "@/modules/events/events.server";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, ShieldAlert, Ban, ScrollText, Boxes, UserX } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { DashboardCharts } from "./dashboard-charts";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { OnboardingTour } from "./onboarding-tour";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/api/auth/force-signout");

  const [data, me] = await Promise.all([
    getDashboardOverview(membership.organizationId),
    getUserOnboardedAt(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={60_000} />
      <OnboardingTour show={!me?.onboardedAt} />
      <PageHeader
        title="Security Overview"
        description={`${membership.organization.name} · Production`}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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
          title="BOLA / IDOR"
          value={data.bolaCount}
          icon={UserX}
          iconColor="#7c3aed"
          iconBg="#f5f3ff"
          delta="Auth bypass attempts"
        />
        <KpiCard
          title="Redacted Payloads"
          value="100%"
          icon={ScrollText}
          iconColor="#d97706"
          iconBg="#fffbeb"
          delta="Scrubbed at source"
          deltaPositive
        />
      </div>

      {/* Charts Row */}
      <DashboardCharts chartData={data.chartData} severityData={data.severityData} />

      {/* Bottom Row: Recent Events + Top Endpoints */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
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
            </div>
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
