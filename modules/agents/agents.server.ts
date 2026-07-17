import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";

/** Public agent fields — never includes hmacSecret. */
const AGENT_PUBLIC_SELECT = {
  id: true,
  projectId: true,
  language: true,
  framework: true,
  version: true,
  mode: true,
  status: true,
  killSwitch: true,
  lastHeartbeatAt: true,
  channel: true,
  pinnedVersion: true,
  maintenanceWindow: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createAgent(
  projectId: string,
  organizationId: string,
  data: { language: string; framework?: string; mode?: string }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;
  // hmacSecret is returned once at creation for operator configuration.
  return prisma.agent.create({
    data: {
      projectId,
      language: data.language,
      framework: data.framework ?? null,
      mode: data.mode ?? "monitor",
      version: "unknown",
      status: "offline",
      hmacSecret: randomBytes(32).toString("hex"),
    },
  });
}

export async function getAgents(organizationId: string) {
  return prisma.agent.findMany({
    where: { project: { organizationId } },
    select: {
      ...AGENT_PUBLIC_SELECT,
      project: { select: { name: true, language: true } },
    },
    orderBy: { lastHeartbeatAt: "desc" },
  });
}

export async function getAgent(id: string, organizationId: string) {
  return prisma.agent.findFirst({
    where: { id, project: { organizationId } },
    select: {
      ...AGENT_PUBLIC_SELECT,
      project: {
        select: {
          id: true,
          name: true,
          language: true,
          organizationId: true,
        },
      },
    },
  });
}

export async function setAgentKillSwitch(
  id: string,
  organizationId: string,
  killSwitch: boolean
) {
  const agent = await prisma.agent.findFirst({
    where: { id, project: { organizationId } },
    select: { id: true },
  });
  if (!agent) return null;
  return prisma.agent.update({
    where: { id },
    data: { killSwitch },
    select: AGENT_PUBLIC_SELECT,
  });
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
    select: { id: true },
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
    select: AGENT_PUBLIC_SELECT,
  });
}
