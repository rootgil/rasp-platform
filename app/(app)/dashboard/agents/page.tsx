import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMembership } from "@/modules/organizations/membership.server";
import { getAgents } from "@/modules/agents/agents.server";
import { listProjectOptions } from "@/modules/projects/projects.server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { CreateAgentDialog } from "./create-agent-dialog";
import { AutoRefresh } from "@/components/shared/auto-refresh";

export default async function AgentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const preferred = (session.user as { organizationId?: string }).organizationId;
  const membership = await getMembership(session.user.id, preferred);
  if (!membership) redirect("/login");
  const orgId = membership.organizationId;

  const [agents, projects] = await Promise.all([
    getAgents(orgId),
    listProjectOptions(orgId),
  ]);

  const online = agents.filter((a) => a.status === "online").length;

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <PageHeader
        title="Agents"
        description={`${online} of ${agents.length} online`}
        action={
          <CreateAgentDialog projects={projects}>
            <Button><Plus size={16} />New Agent</Button>
          </CreateAgentDialog>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Agent ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Language</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((a) => (
                <tr key={a.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/agents/${a.id}`} className="font-mono text-xs text-brand hover:underline">
                      {a.id.slice(0, 14)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">{a.project.name}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary capitalize hidden sm:table-cell">{a.language}</td>
                  <td className="px-4 py-3 font-mono text-xs hidden sm:table-cell">{a.version}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={a.mode} /></td>
                  <td className="px-4 py-3 text-xs text-text-secondary capitalize hidden md:table-cell">{a.channel}</td>
                  <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell">
                    {a.lastHeartbeatAt ? formatRelativeTime(a.lastHeartbeatAt) : "Never"}
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">
                    No agents connected. Install the RASP agent in your application.
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
