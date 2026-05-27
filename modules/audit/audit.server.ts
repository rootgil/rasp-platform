import { prisma } from "@/lib/prisma";

export async function getAuditLogs(
  organizationId: string,
  { limit = 100 }: { limit?: number } = {}
) {
  return prisma.auditLog.findMany({
    where: { organizationId },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAllAuditLogs({
  limit = 200,
  actorId,
  action,
}: {
  limit?: number;
  actorId?: string;
  action?: string;
} = {}) {
  return prisma.auditLog.findMany({
    where: {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    },
    include: {
      actor: { select: { name: true, email: true } },
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
