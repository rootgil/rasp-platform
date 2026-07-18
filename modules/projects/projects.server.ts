import { prisma } from "@/lib/prisma";
import { AGENT_PUBLIC_SELECT } from "@/modules/agents/agents.server";

const API_KEY_PUBLIC_SELECT = {
  id: true,
  prefix: true,
  name: true,
  revoked: true,
  createdAt: true,
  projectId: true,
} as const;

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

export async function listProjectOptions(organizationId: string) {
  return prisma.project.findMany({
    where: { organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getProject(id: string, organizationId: string) {
  return prisma.project.findFirst({
    where: { id, organizationId },
    include: {
      agents: {
        orderBy: { createdAt: "desc" },
        select: AGENT_PUBLIC_SELECT,
      },
      apiKeys: {
        where: { revoked: false },
        orderBy: { createdAt: "desc" },
        select: API_KEY_PUBLIC_SELECT,
      },
      securityEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      discoveredEndpoints: { orderBy: { riskScore: "desc" }, take: 10 },
      _count: {
        select: { securityEvents: true, alerts: true, discoveredEndpoints: true },
      },
    },
  });
}

/** Backoffice project detail — no org filter; never selects hmacSecret/keyHash. */
export async function getProjectAdmin(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      agents: {
        orderBy: { createdAt: "desc" },
        select: AGENT_PUBLIC_SELECT,
      },
      apiKeys: {
        where: { revoked: false },
        orderBy: { createdAt: "desc" },
        select: API_KEY_PUBLIC_SELECT,
      },
      securityEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      discoveredEndpoints: { orderBy: { riskScore: "desc" }, take: 10 },
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
