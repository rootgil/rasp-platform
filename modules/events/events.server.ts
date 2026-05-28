import { prisma } from "@/lib/prisma";
import { decryptForProject } from "@/lib/envelope";

export interface EventFilters {
  severity?: string;
  type?: string;
  projectId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function getEvents(
  organizationId: string,
  filters: EventFilters = {}
) {
  const { severity, type, projectId, action, from, to, page = 0, pageSize = 50 } = filters;

  const where: Record<string, unknown> = {
    project: { organizationId },
  };

  if (severity) where.severity = severity;
  if (type) where.type = type;
  if (projectId) where.projectId = projectId;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [total, items] = await Promise.all([
    prisma.securityEvent.count({ where }),
    prisma.securityEvent.findMany({
      where,
      include: {
        project: { select: { name: true } },
        agent: { select: { id: true, language: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: page * pageSize,
      take: pageSize,
    }),
  ]);

  const decrypted = await Promise.all(
    items.map(async (item) => ({
      ...item,
      payload: await decryptForProject(item.projectId, item.payload),
    }))
  );

  return { total, items: decrypted };
}

export async function getEvent(id: string, organizationId: string) {
  const event = await prisma.securityEvent.findFirst({
    where: { id, project: { organizationId } },
    include: {
      project: true,
      agent: true,
    },
  });
  if (!event) return null;
  return { ...event, payload: await decryptForProject(event.projectId, event.payload) };
}

export async function getRecentEvents(organizationId: string, limit = 10) {
  return prisma.securityEvent.findMany({
    where: { project: { organizationId } },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getEventStats(organizationId: string) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total24h, bySeverity, blocked, byDay] = await Promise.all([
    prisma.securityEvent.count({
      where: { project: { organizationId }, createdAt: { gte: since24h } },
    }),
    prisma.securityEvent.groupBy({
      by: ["severity"],
      where: { project: { organizationId }, createdAt: { gte: since7d } },
      _count: true,
    }),
    prisma.securityEvent.count({
      where: { project: { organizationId }, action: "block" },
    }),
    prisma.securityEvent.findMany({
      where: { project: { organizationId }, createdAt: { gte: since7d } },
      select: { createdAt: true, severity: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return { total24h, bySeverity, blocked, byDay };
}
