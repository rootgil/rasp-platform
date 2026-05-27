import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function BackofficeOrgsPage() {
  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { members: true, projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description={`${orgs.length} organizations on the platform`} />
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Members</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Projects</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Agents</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgs.map(async (org) => {
                const agentCount = await prisma.agent.count({ where: { project: { organizationId: org.id } } });
                return (
                  <tr key={org.id} className="hover:bg-background">
                    <td className="px-4 py-3">
                      <Link href={`/backoffice/organizations/${org.id}`} className="font-medium text-brand hover:underline">
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium uppercase text-text-secondary">{org.plan}</td>
                    <td className="px-4 py-3 text-xs">{org._count.members}</td>
                    <td className="px-4 py-3 text-xs">{org._count.projects}</td>
                    <td className="px-4 py-3 text-xs">{agentCount}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">{formatDate(org.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
