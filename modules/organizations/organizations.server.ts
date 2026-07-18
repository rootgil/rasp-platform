import { prisma } from "@/lib/prisma";

export async function getAllOrganizations() {
  const orgs = await prisma.organization.findMany({
    include: {
      _count: {
        select: { members: true, projects: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const projectAgentCounts = await prisma.project.findMany({
    select: {
      organizationId: true,
      _count: { select: { agents: true } },
    },
  });
  const agentCountByOrg = new Map<string, number>();
  for (const p of projectAgentCounts) {
    agentCountByOrg.set(
      p.organizationId,
      (agentCountByOrg.get(p.organizationId) ?? 0) + p._count.agents
    );
  }

  return orgs.map((org) => ({
    ...org,
    agentCount: agentCountByOrg.get(org.id) ?? 0,
  }));
}

export async function getOrganization(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      projects: {
        include: {
          _count: { select: { agents: true, securityEvents: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getRecentOrganizations(limit = 5) {
  return prisma.organization.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true, projects: true } } },
  });
}

/** Platform users with org memberships (backoffice customers). */
export async function listCustomers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      memberships: {
        include: { organization: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlatformStats() {
  const [totalOrgs, totalAgents, onlineAgents, events24h] = await Promise.all([
    prisma.organization.count(),
    prisma.agent.count(),
    prisma.agent.count({ where: { status: "online" } }),
    prisma.securityEvent.count({
      where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
    }),
  ]);

  const versionDist = await prisma.agent.groupBy({
    by: ["version"],
    _count: true,
    orderBy: { _count: { version: "desc" } },
    take: 5,
  });

  return { totalOrgs, totalAgents, onlineAgents, events24h, versionDist };
}
