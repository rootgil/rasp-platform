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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase hidden md:table-cell">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase hidden lg:table-cell">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 font-mono text-xs text-[#94a3b8]">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-[#0f172a]">
                    {log.actor ? (log.actor.name ?? log.actor.email) : "system"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#475569]">
                    {log.organization?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#2563eb]">{log.action}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#94a3b8] hidden md:table-cell">
                    {log.target ? log.target.slice(0, 14) + "…" : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8] hidden lg:table-cell max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#94a3b8]">
                    No audit logs found
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
