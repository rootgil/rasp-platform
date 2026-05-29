import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { PromoteVersionButton } from "./promote-version-button";
import { NewVersionButton } from "./new-version-button";
import { VersionActions } from "./version-actions";
import { VersionExposureDialog } from "./version-exposure-dialog";
import { getRolloutKpis } from "@/modules/rollout/rollout.server";
import { CheckCircle2, Percent, Clock, Activity } from "lucide-react";

const STAGE_LABELS: Record<number, string> = {
  0: "Not started",
  1: "1%",
  2: "10%",
  3: "50%",
  4: "100%",
};

export default async function AgentVersionsPage() {
  const [versions, kpis] = await Promise.all([
    prisma.agentVersion.findMany({ orderBy: { createdAt: "desc" } }),
    getRolloutKpis(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Versions"
        description="Manage RASP agent release channels and promotions"
        action={<NewVersionButton />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Rollouts"
          value={kpis.totalRollouts}
          icon={Activity}
          iconColor="#2563eb"
          iconBg="#eff6ff"
        />
        <KpiCard
          title="Success Rate"
          value={`${kpis.successRate}%`}
          icon={CheckCircle2}
          iconColor={kpis.successRate >= 80 ? "#16a34a" : "#d97706"}
          iconBg={kpis.successRate >= 80 ? "#f0fdf4" : "#fffbeb"}
        />
        <KpiCard
          title="Canary Catch Rate"
          value={`${kpis.canaryCatchRate}%`}
          icon={Percent}
          iconColor="#2563eb"
          iconBg="#eff6ff"
        />
        <KpiCard
          title="Avg MTTR"
          value={kpis.avgMttrSeconds != null ? `${Math.round(kpis.avgMttrSeconds / 60)}m` : "-"}
          icon={Clock}
          iconColor="#d97706"
          iconBg="#fffbeb"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Rollout</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Changelog</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Released</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {versions.map((v) => (
                  <tr key={v.id} className="hover:bg-background">
                    <td className="px-4 py-3 font-mono font-bold text-text-primary">{v.version}</td>
                    <td className="px-4 py-3 text-xs capitalize">{v.channel}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={v.status} />
                        {v.halted && <StatusBadge status="halted" />}
                        {v.quarantined && <StatusBadge status="quarantined" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {v.rolloutStage > 0
                        ? `Stage ${v.rolloutStage} - ${STAGE_LABELS[v.rolloutStage] ?? `${v.rolloutPercent}%`}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary hidden lg:table-cell max-w-xs truncate">
                      {v.changelog ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {v.releasedAt ? formatDate(v.releasedAt) : "Not released"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {v.status === "candidate" && (
                          <PromoteVersionButton versionId={v.id} version={v.version} />
                        )}
                        <VersionActions
                          versionId={v.id}
                          version={v.version}
                          status={v.status}
                          rolloutStage={v.rolloutStage}
                          halted={v.halted}
                          quarantined={v.quarantined}
                        />
                        <VersionExposureDialog version={v.version} />
                      </div>
                    </td>
                  </tr>
                ))}
                {versions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                      No versions yet.
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
