import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import { AlertActions } from "./alert-actions";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const alerts = await prisma.alert.findMany({
    where: {
      project: { organizationId: membership.organizationId },
      ...(status ? { status } : {}),
    },
    include: {
      project: { select: { name: true } },
      securityEvent: { select: { type: true, path: true, method: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const open = alerts.filter((a) => a.status === "open").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description={`${open} open alerts`}
      />

      <div className="flex gap-2">
        {["", "open", "investigating", "resolved"].map((s) => (
          <a
            key={s}
            href={s ? `?status=${s}` : "?"}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              (status ?? "") === s
                ? "bg-brand text-white"
                : "bg-white border border-border text-text-secondary hover:bg-background"
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </a>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Attack Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">When</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
                  <td className="px-4 py-3 font-mono text-xs">{alert.securityEvent.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-sm">{alert.project.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary hidden md:table-cell">
                    {alert.securityEvent.method} {alert.securityEvent.path}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={alert.status} /></td>
                  <td className="px-4 py-3 text-xs text-text-muted">{formatRelativeTime(alert.createdAt)}</td>
                  <td className="px-4 py-3"><AlertActions alertId={alert.id} currentStatus={alert.status} /></td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                    No alerts found
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
