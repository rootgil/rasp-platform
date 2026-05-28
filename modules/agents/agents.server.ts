import { prisma } from "@/lib/prisma";

export async function createAgent(
  projectId: string,
  organizationId: string,
  data: { language: string; framework?: string; mode?: string }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;
  return prisma.agent.create({
    data: {
      projectId,
      language: data.language,
      framework: data.framework ?? null,
      mode: data.mode ?? "monitor",
      version: "unknown",
      status: "offline",
    },
  });
}

export async function getAgents(organizationId: string) {
  return prisma.agent.findMany({
    where: { project: { organizationId } },
    include: { project: { select: { name: true, language: true } } },
    orderBy: { lastHeartbeatAt: "desc" },
  });
}

export async function getAgent(id: string, organizationId: string) {
  return prisma.agent.findFirst({
    where: { id, project: { organizationId } },
    include: { project: true },
  });
}

export async function setAgentKillSwitch(
  id: string,
  organizationId: string,
  killSwitch: boolean
) {
  const agent = await prisma.agent.findFirst({
    where: { id, project: { organizationId } },
  });
  if (!agent) return null;
  return prisma.agent.update({ where: { id }, data: { killSwitch } });
}
