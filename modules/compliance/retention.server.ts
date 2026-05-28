import { prisma } from "@/lib/prisma";

/**
 * Compliance: right-to-deletion and retention purge (Addendum B.4/B.5).
 *
 * These operate on the telemetry stored in the management database
 * (SecurityEvent, Alert, DiscoveredEndpoint). They are scoped by organization
 * so a tenant can only purge its own data.
 */

export interface PurgeCounts {
  events: number;
  alerts: number;
  endpoints: number;
}

async function projectInOrg(projectId: string, organizationId: string): Promise<boolean> {
  const p = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  return p !== null;
}

/**
 * Right-to-deletion: permanently remove all telemetry for a project.
 * Alerts are deleted first (FK to SecurityEvent).
 */
export async function purgeProjectData(
  projectId: string,
  organizationId: string
): Promise<PurgeCounts | null> {
  if (!(await projectInOrg(projectId, organizationId))) return null;

  const [alerts, events, endpoints] = await prisma.$transaction([
    prisma.alert.deleteMany({ where: { projectId } }),
    prisma.securityEvent.deleteMany({ where: { projectId } }),
    prisma.discoveredEndpoint.deleteMany({ where: { projectId } }),
  ]);

  return { events: events.count, alerts: alerts.count, endpoints: endpoints.count };
}

/**
 * Retention purge: delete telemetry older than `retentionDays` for a project.
 */
export async function purgeByRetention(
  projectId: string,
  organizationId: string,
  retentionDays: number
): Promise<PurgeCounts | null> {
  if (!(await projectInOrg(projectId, organizationId))) return null;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const [alerts, events] = await prisma.$transaction([
    prisma.alert.deleteMany({ where: { projectId, createdAt: { lt: cutoff } } }),
    prisma.securityEvent.deleteMany({ where: { projectId, createdAt: { lt: cutoff } } }),
  ]);

  return { events: events.count, alerts: alerts.count, endpoints: 0 };
}
