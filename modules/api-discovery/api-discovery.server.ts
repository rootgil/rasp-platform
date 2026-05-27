import { prisma } from "@/lib/prisma";

export async function getDiscoveredEndpoints(
  organizationId: string,
  projectId?: string
) {
  return prisma.discoveredEndpoint.findMany({
    where: {
      project: { organizationId },
      ...(projectId ? { projectId } : {}),
    },
    include: { project: { select: { name: true } } },
    orderBy: { riskScore: "desc" },
  });
}

export async function getEndpointStats(organizationId: string) {
  const [total, shadow, zombie, unauthenticated] = await Promise.all([
    prisma.discoveredEndpoint.count({ where: { project: { organizationId } } }),
    prisma.discoveredEndpoint.count({
      where: { project: { organizationId }, isShadowApi: true },
    }),
    prisma.discoveredEndpoint.count({
      where: { project: { organizationId }, isZombieApi: true },
    }),
    prisma.discoveredEndpoint.count({
      where: { project: { organizationId }, authStatus: "none" },
    }),
  ]);
  return { total, shadow, zombie, unauthenticated };
}
