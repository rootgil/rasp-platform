import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMembership } from "@/modules/organizations/membership.server";
import { getEvents } from "@/modules/events/events.server";
import { listProjectOptions } from "@/modules/projects/projects.server";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { EventFilters } from "./event-filters";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { EventStreamRefresh } from "@/components/shared/event-stream-refresh";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; type?: string; projectId?: string }>;
}) {
  const filters = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const preferred = (session.user as { organizationId?: string }).organizationId;
  const membership = await getMembership(session.user.id, preferred);
  if (!membership) redirect("/login");
  const orgId = membership.organizationId;

  const [eventsResult, projects] = await Promise.all([
    getEvents(orgId, {
      severity: filters.severity,
      type: filters.type,
      projectId: filters.projectId,
      pageSize: 100,
    }),
    listProjectOptions(orgId),
  ]);
  const events = eventsResult.items;

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={10_000} />
      <EventStreamRefresh />
      <PageHeader
        title="Security Events"
        description={`${events.length} events`}
      />

      <EventFilters projects={projects} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Attack Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">When</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-3"><SeverityBadge severity={ev.severity} /></td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/dashboard/events/${ev.id}`} className="text-text-primary hover:text-brand">
                        {ev.type.replace(/_/g, " ")}
                      </Link>
                      {(ev.type === "bola_detection" || ev.type === "idor_detection") && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wide">
                          BOLA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{ev.project.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary hidden md:table-cell">
                    {ev.method} {ev.path}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ev.action} />
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {formatRelativeTime(ev.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/events/${ev.id}`}
                      className="text-xs text-brand hover:underline whitespace-nowrap"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                    No security events found
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
