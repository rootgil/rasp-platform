import { prisma } from "@/lib/prisma";

export async function getProjects(organizationId: string) {
  return prisma.project.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: { agents: true, securityEvents: true, alerts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(id: string, organizationId: string) {
  return prisma.project.findFirst({
    where: { id, organizationId },
    include: {
      agents: { orderBy: { createdAt: "desc" } },
      apiKeys: { where: { revoked: false }, orderBy: { createdAt: "desc" } },
      _count: {
        select: { securityEvents: true, alerts: true, discoveredEndpoints: true },
      },
    },
  });
}

export async function createProject(
  organizationId: string,
  data: {
    name: string;
    language: string;
    framework?: string;
    environment?: string;
  }
) {
  return prisma.project.create({
    data: { ...data, organizationId },
  });
}

export async function deleteProject(id: string, organizationId: string) {
  return prisma.project.deleteMany({ where: { id, organizationId } });
}
