import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { FileSearch } from "lucide-react";

export default async function AuditLogsPage() {
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: membership.organizationId },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="All administrative actions in your organization"
      />

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-3 text-xs text-text-muted font-mono">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3 text-xs">
                    {log.actor ? (
                      <span className="text-text-primary font-medium">{log.actor.name ?? log.actor.email}</span>
                    ) : (
                      <span className="text-text-muted">system</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-brand">{log.action}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted hidden md:table-cell">
                    {log.target ? log.target.slice(0, 16) + "…" : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileSearch size={24} className="text-text-muted" />
                      <p className="text-sm text-text-muted">No audit logs yet</p>
                    </div>
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
