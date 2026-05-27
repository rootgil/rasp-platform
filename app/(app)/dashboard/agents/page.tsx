import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default async function AgentsPage() {
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const agents = await prisma.agent.findMany({
    where: { project: { organizationId: membership.organizationId } },
    include: { project: { select: { name: true } } },
    orderBy: { lastHeartbeatAt: "desc" },
  });

  const online = agents.filter((a) => a.status === "online").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description={`${online} of ${agents.length} online`}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Agent ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Language</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Last Heartbeat</th>
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
                  <td className="px-4 py-3 text-xs text-text-secondary capitalize">{a.language}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.version}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.mode} /></td>
                  <td className="px-4 py-3 text-xs text-text-secondary capitalize">{a.channel}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">
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
