import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";

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
      // Per-agent HMAC secret for payload integrity (Addendum E.5). Surfaced
      // once at creation so the operator can configure `hmacSecret` on the agent.
      hmacSecret: randomBytes(32).toString("hex"),
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

/**
 * Customer version controls (Addendum D.2): pin/unpin a version and set the
 * maintenance window during which upgrades may be advertised.
 */
export async function setAgentVersionControls(
  id: string,
  organizationId: string,
  data: { pinnedVersion?: string | null; maintenanceWindow?: unknown }
) {
  const agent = await prisma.agent.findFirst({
    where: { id, project: { organizationId } },
  });
  if (!agent) return null;
  return prisma.agent.update({
    where: { id },
    data: {
      ...(data.pinnedVersion !== undefined ? { pinnedVersion: data.pinnedVersion } : {}),
      ...(data.maintenanceWindow !== undefined
        ? { maintenanceWindow: (data.maintenanceWindow ?? null) as never }
        : {}),
    },
  });
}
