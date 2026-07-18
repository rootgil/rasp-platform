import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMembership } from "@/modules/organizations/membership.server";
import { getAlerts } from "@/modules/alerts/alerts.server";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import { AlertActions } from "./alert-actions";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { EventStreamRefresh } from "@/components/shared/event-stream-refresh";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const preferred = (session.user as { organizationId?: string }).organizationId;
  const membership = await getMembership(session.user.id, preferred);
  if (!membership) redirect("/login");
  const orgId = membership.organizationId;

  const alerts = await getAlerts(orgId, { status });

  const open = alerts.filter((a) => a.status === "open").length;

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={10_000} />
      <EventStreamRefresh />
      <PageHeader
        title="Alerts"
        description={`${open} open alerts`}
      />

      <div className="flex flex-wrap gap-2">
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
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
