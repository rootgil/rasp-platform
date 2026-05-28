import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Webhook, AlertTriangle, Clock, Shield } from "lucide-react";
import { ExportButton } from "./export-button";
import { ImportSpecDialog } from "./import-spec-dialog";

export default async function ApiDiscoveryPage() {
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
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
        description="Runtime endpoint inventory - observed from live traffic"
        action={
          <div className="flex items-center gap-2">
            <ImportSpecDialog />
            <ExportButton />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Endpoints" value={endpoints.length} icon={Webhook} iconColor="#2563eb" iconBg="#eff6ff" />
        <KpiCard title="Shadow APIs" value={totalShadow} icon={AlertTriangle} iconColor="#dc2626" iconBg="#fef2f2" />
        <KpiCard title="Zombie APIs" value={totalZombie} icon={Clock} iconColor="#d97706" iconBg="#fffbeb" />
        <KpiCard title="No Auth" value={unauthenticated} icon={Shield} iconColor="#ea580c" iconBg="#fff7ed" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Path</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Auth</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Sensitive Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Risk</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Flags</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Traffic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {endpoints.map((ep) => (
                <tr key={ep.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-text-primary">{ep.method}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{ep.pathPattern}</td>
                  <td className="px-4 py-3 text-xs hidden md:table-cell">{ep.project.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      ep.authStatus === "none"
                        ? "text-critical-text bg-critical-bg border-[#fecaca]"
                        : ep.authStatus === "unknown"
                        ? "text-medium-text bg-medium-bg border-[#fde68a]"
                        : "text-success-text bg-success-bg border-[#bbf7d0]"
                    }`}>
                      {ep.authStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs hidden lg:table-cell">
                    {ep.hasSensitiveData ? (
                      <span className="text-high font-medium">Yes</span>
                    ) : (
                      <span className="text-text-muted">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-border-light overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${ep.riskScore}%`,
                            backgroundColor: ep.riskScore >= 70 ? "#dc2626" : ep.riskScore >= 40 ? "#d97706" : "#16a34a",
                          }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${ep.riskScore >= 70 ? "text-critical" : ep.riskScore >= 40 ? "text-medium" : "text-success"}`}>
                        {ep.riskScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex gap-1">
                      {ep.isShadowApi && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-critical-bg text-critical-text border border-[#fecaca] font-medium">Shadow</span>
                      )}
                      {ep.isZombieApi && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-medium-bg text-medium-text border border-[#fde68a] font-medium">Zombie</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary hidden md:table-cell">{ep.trafficCount}</td>
                </tr>
              ))}
              {endpoints.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">
                    No endpoints discovered yet. Install an agent to start collecting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
