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
  if (!session?.user) redirect("/login");
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Agent ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Language</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {agents.map((a) => (
                <tr key={a.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/agents/${a.id}`} className="font-mono text-xs text-[#2563eb] hover:underline">
                      {a.id.slice(0, 14)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#0f172a]">{a.project.name}</td>
                  <td className="px-4 py-3 text-xs text-[#475569] capitalize">{a.language}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.version}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.mode} /></td>
                  <td className="px-4 py-3 text-xs text-[#475569] capitalize">{a.channel}</td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">
                    {a.lastHeartbeatAt ? formatRelativeTime(a.lastHeartbeatAt) : "Never"}
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#94a3b8]">
                    No agents connected. Install the RASP agent in your application.
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
