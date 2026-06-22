import { prisma } from "@/lib/prisma";

const ZOMBIE_THRESHOLD_DAYS = 30;

function endpointWhere(organizationId: string, projectId?: string) {
  return {
    project: { organizationId },
    ...(projectId ? { projectId } : {}),
  };
}

/**
 * Recompute zombie flags (Addendum A.5): endpoints with zero traffic for 30+
 * days that are still routable. Marks stale endpoints as zombies and clears the
 * flag on endpoints seen recently.
 */
export async function recomputeZombieFlags(organizationId: string): Promise<void> {
  const cutoff = new Date(Date.now() - ZOMBIE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  await Promise.all([
    prisma.discoveredEndpoint.updateMany({
      where: { project: { organizationId }, lastSeenAt: { lt: cutoff }, isZombieApi: false },
      data: { isZombieApi: true },
    }),
    prisma.discoveredEndpoint.updateMany({
      where: { project: { organizationId }, lastSeenAt: { gte: cutoff }, isZombieApi: true },
      data: { isZombieApi: false },
    }),
  ]);
}

/**
 * Auth coverage map data (Addendum A.5): per-endpoint authentication,
 * authorization and sensitivity, used to render a heatmap.
 */
export async function getAuthCoverage(organizationId: string, projectId?: string) {
  const endpoints = await prisma.discoveredEndpoint.findMany({
    where: endpointWhere(organizationId, projectId),
    select: {
      authStatus: true,
      authorization: true,
      hasSensitiveData: true,
    },
  });
  const total = endpoints.length || 1;
  const authenticated = endpoints.filter((e) => e.authStatus === "authenticated").length;
  const authorized = endpoints.filter((e) => e.authorization === "enforced").length;
  const sensitiveNoAuth = endpoints.filter(
    (e) => e.hasSensitiveData && e.authStatus !== "authenticated"
  ).length;
  return {
    total: endpoints.length,
    authenticated,
    authorized,
    sensitiveNoAuth,
    authPct: Math.round((authenticated / total) * 100),
    authzPct: Math.round((authorized / total) * 100),
  };
}

export async function getDiscoveredEndpoints(
  organizationId: string,
  projectId?: string
) {
  return prisma.discoveredEndpoint.findMany({
    where: endpointWhere(organizationId, projectId),
    include: { project: { select: { name: true } } },
    orderBy: { riskScore: "desc" },
  });
}

export async function getEndpointStats(organizationId: string, projectId?: string) {
  const where = endpointWhere(organizationId, projectId);
  const [total, shadow, zombie, unauthenticated] = await Promise.all([
    prisma.discoveredEndpoint.count({ where }),
    prisma.discoveredEndpoint.count({ where: { ...where, isShadowApi: true } }),
    prisma.discoveredEndpoint.count({ where: { ...where, isZombieApi: true } }),
    prisma.discoveredEndpoint.count({ where: { ...where, authStatus: "unauthenticated" } }),
  ]);
  return { total, shadow, zombie, unauthenticated };
}
