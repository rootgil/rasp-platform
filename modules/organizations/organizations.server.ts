import { prisma } from "@/lib/prisma";

export async function getAllOrganizations() {
  return prisma.organization.findMany({
    include: {
      _count: {
        select: { members: true, projects: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrganization(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { name: true, email: true, role: true } } },
      },
      projects: {
        include: {
          _count: { select: { agents: true, securityEvents: true } },
        },
      },
    },
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
