import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Server, ShieldAlert, Activity } from "lucide-react";

export default async function BackofficePage() {
  const since24h = new Date(new Date().getTime() - 86400000);

  const [totalOrgs, totalAgents, onlineAgents, events24h, versionDist, recentOrgs] =
    await Promise.all([
      prisma.organization.count(),
      prisma.agent.count(),
      prisma.agent.count({ where: { status: "online" } }),
      prisma.securityEvent.count({ where: { createdAt: { gte: since24h } } }),
      prisma.agent.groupBy({
        by: ["version"],
        _count: true,
        orderBy: { _count: { version: "desc" } },
        take: 5,
      }),
      prisma.organization.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { members: true, projects: true } } },
      }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Overview" description="Global platform health and statistics" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Organizations" value={totalOrgs} icon={Building2} iconColor="#2563eb" iconBg="#eff6ff" />
        <KpiCard title="Total Agents" value={totalAgents} icon={Server} iconColor="#16a34a" iconBg="#f0fdf4" />
        <KpiCard title="Online Agents" value={onlineAgents} icon={Activity} iconColor="#16a34a" iconBg="#f0fdf4" />
        <KpiCard title="Events 24h" value={events24h} icon={ShieldAlert} iconColor="#dc2626" iconBg="#fef2f2" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Recent Organizations</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Members</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Projects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {recentOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-[#f8fafc]">
                    <td className="px-4 py-3 font-medium text-[#0f172a]">{org.name}</td>
                    <td className="px-4 py-3 text-xs uppercase font-medium text-[#475569]">{org.plan}</td>
                    <td className="px-4 py-3 text-xs">{org._count.members}</td>
                    <td className="px-4 py-3 text-xs">{org._count.projects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Agent Version Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {versionDist.map((v, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#475569] w-16">{v.version}</span>
                <div className="flex-1 h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2563eb]"
                    style={{ width: `${Math.round((v._count / totalAgents) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-[#475569] w-8 text-right">{v._count}</span>
              </div>
            ))}
            {versionDist.length === 0 && <p className="text-sm text-[#94a3b8]">No agents registered</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
