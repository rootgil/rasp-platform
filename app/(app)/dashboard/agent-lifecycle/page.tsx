import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMembership } from "@/modules/organizations/membership.server";
import { getAgents } from "@/modules/agents/agents.server";
import { listPublishedVersions } from "@/modules/rollout/rollout.server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KillSwitchToggle } from "./kill-switch-toggle";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { formatDate } from "@/lib/utils";

const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  stable: "2-week delay after canary. Recommended for production.",
  early: "1-week delay. Early access to improvements.",
  edge: "Latest candidate. For non-production testing only.",
};

export default async function AgentLifecyclePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/login");

  const [agents, versions] = await Promise.all([
    getAgents(membership.organizationId),
    listPublishedVersions(),
  ]);

  return (
    <div className="space-y-6">
      <AutoRefresh />
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
                <p className="text-2xl font-bold text-text-primary font-mono">
                  {latest?.version ?? "-"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {CHANNEL_DESCRIPTIONS[channel]}
                </p>
                {latest?.releasedAt && (
                  <p className="text-xs text-text-muted mt-2">
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
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Agent ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Last Heartbeat</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Kill Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-background">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary hidden sm:table-cell">{agent.id.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-sm font-medium">{agent.project.name}</td>
                  <td className="px-4 py-3 font-mono text-xs hidden md:table-cell">{agent.version}</td>
                  <td className="px-4 py-3 text-xs capitalize hidden md:table-cell">{agent.channel}</td>
                  <td className="px-4 py-3"><StatusBadge status={agent.status} /></td>
                  <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell">
                    {agent.lastHeartbeatAt ? formatDate(agent.lastHeartbeatAt) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <KillSwitchToggle agentId={agent.id} enabled={agent.killSwitch} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
