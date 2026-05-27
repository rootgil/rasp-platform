import { prisma } from "@/lib/prisma";

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
