import { prisma } from "@/lib/prisma";

export async function getAlerts(
  organizationId: string,
  filters: { status?: string; severity?: string } = {}
) {
  return prisma.alert.findMany({
    where: {
      project: { organizationId },
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
    },
    include: {
      project: { select: { name: true } },
      securityEvent: {
        select: { type: true, path: true, method: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateAlert(
  id: string,
  organizationId: string,
  data: { status?: string; assignedTo?: string }
) {
  const alert = await prisma.alert.findFirst({
    where: { id, project: { organizationId } },
  });
  if (!alert) return null;
  return prisma.alert.update({ where: { id }, data });
}
