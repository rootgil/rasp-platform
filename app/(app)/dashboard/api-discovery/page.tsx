import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Webhook, AlertTriangle, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ApiDiscoveryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) redirect("/login");

  const endpoints = await prisma.discoveredEndpoint.findMany({
    where: { project: { organizationId: membership.organizationId } },
    include: { project: { select: { name: true } } },
    orderBy: { riskScore: "desc" },
  });

  const totalShadow = endpoints.filter((e) => e.isShadowApi).length;
  const totalZombie = endpoints.filter((e) => e.isZombieApi).length;
  const unauthenticated = endpoints.filter((e) => e.authStatus === "none").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Discovery"
        description="Runtime endpoint inventory — observed from live traffic"
        action={
          <Button variant="secondary">
            Export OpenAPI spec
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Endpoints" value={endpoints.length} icon={Webhook} iconColor="#2563eb" iconBg="#eff6ff" />
        <KpiCard title="Shadow APIs" value={totalShadow} icon={AlertTriangle} iconColor="#dc2626" iconBg="#fef2f2" />
        <KpiCard title="Zombie APIs" value={totalZombie} icon={Clock} iconColor="#d97706" iconBg="#fffbeb" />
        <KpiCard title="No Auth" value={unauthenticated} icon={Shield} iconColor="#ea580c" iconBg="#fff7ed" />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Path</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Auth</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Sensitive Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Risk</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Flags</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Traffic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {endpoints.map((ep) => (
                <tr key={ep.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-[#0f172a]">{ep.method}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#475569]">{ep.pathPattern}</td>
                  <td className="px-4 py-3 text-xs">{ep.project.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      ep.authStatus === "none"
                        ? "text-[#991b1b] bg-[#fef2f2] border-[#fecaca]"
                        : ep.authStatus === "unknown"
                        ? "text-[#92400e] bg-[#fffbeb] border-[#fde68a]"
                        : "text-[#166534] bg-[#f0fdf4] border-[#bbf7d0]"
                    }`}>
                      {ep.authStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {ep.hasSensitiveData ? (
                      <span className="text-[#ea580c] font-medium">Yes</span>
                    ) : (
                      <span className="text-[#94a3b8]">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${ep.riskScore}%`,
                            backgroundColor: ep.riskScore >= 70 ? "#dc2626" : ep.riskScore >= 40 ? "#d97706" : "#16a34a",
                          }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${ep.riskScore >= 70 ? "text-[#dc2626]" : ep.riskScore >= 40 ? "text-[#d97706]" : "text-[#16a34a]"}`}>
                        {ep.riskScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {ep.isShadowApi && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] font-medium">Shadow</span>
                      )}
                      {ep.isZombieApi && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#fffbeb] text-[#92400e] border border-[#fde68a] font-medium">Zombie</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#475569]">{ep.trafficCount}</td>
                </tr>
              ))}
              {endpoints.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#94a3b8]">
                    No endpoints discovered yet. Install an agent to start collecting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
