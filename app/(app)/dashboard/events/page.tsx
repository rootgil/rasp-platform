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
  if (!session?.user) redirect("/login");
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Attack Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase hidden md:table-cell">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-4 py-3"><SeverityBadge severity={ev.severity} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-[#0f172a]">{ev.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-sm">{ev.project.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#475569] hidden md:table-cell">
                    {ev.method} {ev.path}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ev.action} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">
                    <Link href={`/dashboard/events/${ev.id}`} className="hover:text-[#2563eb]">
                      {formatRelativeTime(ev.createdAt)}
                    </Link>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#94a3b8]">
                    No security events found
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
