import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KillSwitchToggle } from "./kill-switch-toggle";
import { formatDate } from "@/lib/utils";
import { Activity } from "lucide-react";

const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  stable: "2-week delay after canary. Recommended for production.",
  early: "1-week delay. Early access to improvements.",
  edge: "Latest candidate. For non-production testing only.",
};

export default async function AgentLifecyclePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) redirect("/login");

  const [agents, versions] = await Promise.all([
    prisma.agent.findMany({
      where: { project: { organizationId: membership.organizationId } },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentVersion.findMany({
      where: { status: "published" },
      orderBy: { releasedAt: "desc" },
    }),
  ]);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Lifecycle"
        description="Version management, channels, and kill-switch controls"
      />

      {/* Channel overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {(["stable", "early", "edge"] as const).map((channel) => {
          const latest = versions.find((v) => v.channel === channel);
          return (
            <Card key={channel}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize">{channel}</CardTitle>
                  {latest && <StatusBadge status={latest.status} />}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[#0f172a] font-mono">
                  {latest?.version ?? "—"}
                </p>
                <p className="text-xs text-[#94a3b8] mt-1">
                  {CHANNEL_DESCRIPTIONS[channel]}
                </p>
                {latest?.releasedAt && (
                  <p className="text-xs text-[#94a3b8] mt-2">
                    Released {formatDate(latest.releasedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Agents table with kill-switch */}
      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Agent ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Last Heartbeat</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Kill Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 font-mono text-xs text-[#475569]">{agent.id.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-sm font-medium">{agent.project.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{agent.version}</td>
                  <td className="px-4 py-3 text-xs capitalize">{agent.channel}</td>
                  <td className="px-4 py-3"><StatusBadge status={agent.status} /></td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">
                    {agent.lastHeartbeatAt ? formatDate(agent.lastHeartbeatAt) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <KillSwitchToggle agentId={agent.id} enabled={agent.killSwitch} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Canary deployment info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[#2563eb]" />
            <CardTitle>Canary Deployment Process</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { stage: "Stage 0", desc: "Internal dogfood", duration: "24–48h" },
              { stage: "Stage 1", desc: "1% of Edge agents", duration: "24h" },
              { stage: "Stage 2", desc: "10% Edge + Early", duration: "48h" },
              { stage: "Stage 3", desc: "100% Edge + Early", duration: "72h" },
              { stage: "Stage 4", desc: "100% Stable", duration: "24h rolling" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-center">
                  <p className="text-xs font-bold text-[#0f172a]">{s.stage}</p>
                  <p className="text-xs text-[#475569]">{s.desc}</p>
                  <p className="text-xs text-[#94a3b8]">{s.duration}</p>
                </div>
                {i < 4 && <div className="text-[#94a3b8]">→</div>}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#94a3b8] mt-3">
            Automatic halt if error rate &gt;0.01% or P99 latency increases &gt;2% at any stage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
