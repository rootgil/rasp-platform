import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Webhook, AlertTriangle, Clock, Shield } from "lucide-react";
import { ExportButton } from "./export-button";
import { ImportSpecDialog } from "./import-spec-dialog";
import { ApiDiscoveryFilters } from "./api-discovery-filters";
import { DataFlowDiagram } from "./data-flow-diagram";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import {
  recomputeZombieFlags,
  getAuthCoverage,
  getDiscoveredEndpoints,
  getEndpointStats,
} from "@/modules/api-discovery/api-discovery.server";

export default async function ApiDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; tab?: string }>;
}) {
  const filters = await searchParams;
  const activeTab = filters.tab === "dataflow" ? "dataflow" : "inventory";
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const orgId = membership.organizationId;

  await recomputeZombieFlags(orgId);

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const projectId =
    filters.projectId && projects.some((p) => p.id === filters.projectId)
      ? filters.projectId
      : undefined;

  const [endpoints, coverage, stats] = await Promise.all([
    getDiscoveredEndpoints(orgId, projectId),
    getAuthCoverage(orgId, projectId),
    getEndpointStats(orgId, projectId),
  ]);

  // Cast sensitiveFields from Prisma Json to string[] for the diagram component.
  const endpointsForDiagram = endpoints.map((ep) => ({
    ...ep,
    sensitiveFields: Array.isArray(ep.sensitiveFields) ? (ep.sensitiveFields as string[]) : null,
  }));

  return (
    <div className="space-y-6">
      <AutoRefresh />
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

      <ApiDiscoveryFilters projects={projects} />

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        <a
          href={`?${new URLSearchParams({ ...(projectId ? { projectId } : {}), tab: "inventory" }).toString()}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "inventory"
              ? "border-text-primary text-text-primary"
              : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          Endpoint Inventory
        </a>
        <a
          href={`?${new URLSearchParams({ ...(projectId ? { projectId } : {}), tab: "dataflow" }).toString()}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "dataflow"
              ? "border-text-primary text-text-primary"
              : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          Sensitive Data Flow
        </a>
      </div>

      {activeTab === "dataflow" ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-text-primary mb-1">Sensitive Data Flow</p>
            <p className="text-xs text-text-muted mb-5">
              PII fields observed per endpoint — used for PIPEDA / Law 25 compliance mapping.
            </p>
            <DataFlowDiagram endpoints={endpointsForDiagram} />
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Endpoints" value={stats.total} icon={Webhook} iconColor="#2563eb" iconBg="#eff6ff" />
        <KpiCard title="Shadow APIs" value={stats.shadow} icon={AlertTriangle} iconColor="#dc2626" iconBg="#fef2f2" />
        <KpiCard title="Zombie APIs" value={stats.zombie} icon={Clock} iconColor="#d97706" iconBg="#fffbeb" />
        <KpiCard title="No Auth" value={stats.unauthenticated} icon={Shield} iconColor="#ea580c" iconBg="#fff7ed" />
      </div>

      {/* Auth coverage map (Addendum A.5) */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary mb-4">Auth Coverage Map</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CoverageBar label="Authentication" pct={coverage.authPct} count={coverage.authenticated} total={coverage.total} />
            <CoverageBar label="Authorization" pct={coverage.authzPct} count={coverage.authorized} total={coverage.total} />
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-text-secondary uppercase">Sensitive · No Auth</p>
              <p className={`mt-1 text-2xl font-bold ${coverage.sensitiveNoAuth > 0 ? "text-critical" : "text-success"}`}>
                {coverage.sensitiveNoAuth}
              </p>
              <p className="text-xs text-text-muted">endpoints handling PII without authentication</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Latency</th>
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
                  <td className="px-4 py-3 text-xs text-text-secondary hidden md:table-cell">
                    {ep.trafficCount}
                    {ep.errorCount > 0 && (
                      <span className="ml-1 text-critical">({ep.errorCount} err)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary hidden lg:table-cell">
                    {ep.avgResponseMs > 0 ? `${ep.avgResponseMs} ms` : "-"}
                  </td>
                </tr>
              ))}
              {endpoints.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-text-muted">
                    No endpoints discovered yet. Install an agent to start collecting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}

function CoverageBar({
  label,
  pct,
  count,
  total,
}: {
  label: string;
  pct: number;
  count: number;
  total: number;
}) {
  const color = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary uppercase">{label}</p>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-border-light overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="mt-1 text-xs text-text-muted">{count} / {total} endpoints</p>
    </div>
  );
}
