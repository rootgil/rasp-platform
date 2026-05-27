import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: action ? { action: { contains: action, mode: "insensitive" } } : {},
    include: {
      actor: { select: { name: true, email: true } },
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Audit" description="All administrative actions across all organizations" />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-background">
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-text-primary">
                    {log.actor ? (log.actor.name ?? log.actor.email) : "system"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {log.organization?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-brand">{log.action}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted hidden md:table-cell">
                    {log.target ? log.target.slice(0, 14) + "…" : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                    No audit logs found
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
