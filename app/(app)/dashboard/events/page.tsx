import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { EventFilters } from "./event-filters";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; type?: string; projectId?: string }>;
}) {
  const filters = await searchParams;
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const where: Record<string, unknown> = {
    project: { organizationId: membership.organizationId },
  };
  if (filters.severity) where.severity = filters.severity;
  if (filters.type) where.type = filters.type;
  if (filters.projectId) where.projectId = filters.projectId;

  const [events, projects] = await Promise.all([
    prisma.securityEvent.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.project.findMany({
      where: { organizationId: membership.organizationId },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-3"><SeverityBadge severity={ev.severity} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-text-primary">{ev.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-sm">{ev.project.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary hidden md:table-cell">
                    {ev.method} {ev.path}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ev.action} />
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    <Link href={`/dashboard/events/${ev.id}`} className="hover:text-brand">
                      {formatRelativeTime(ev.createdAt)}
                    </Link>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
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
