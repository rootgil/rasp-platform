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
            className={`px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
              (status ?? "") === s
                ? "bg-[#2563eb] text-white"
                : "bg-white border border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc]"
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
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Attack Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase hidden md:table-cell">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">When</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
                  <td className="px-4 py-3 font-mono text-xs">{alert.securityEvent.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-sm">{alert.project.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#475569] hidden md:table-cell">
                    {alert.securityEvent.method} {alert.securityEvent.path}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={alert.status} /></td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">{formatRelativeTime(alert.createdAt)}</td>
                  <td className="px-4 py-3"><AlertActions alertId={alert.id} currentStatus={alert.status} /></td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#94a3b8]">
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
