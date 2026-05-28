import { prisma } from "@/lib/prisma";

/**
 * Incident-response controls (Addendum E.6): global kill-switch, per-version
 * quarantine, and version-to-customer forensic mapping.
 */

export async function getPlatformSetting() {
  return prisma.platformSetting.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
}

/** Toggle the platform-wide kill-switch served to every agent on heartbeat. */
export async function setGlobalKillSwitch(enabled: boolean, reason?: string) {
  return prisma.platformSetting.upsert({
    where: { id: "global" },
    update: {
      killSwitch: enabled,
      killReason: enabled ? reason ?? null : null,
      killedAt: enabled ? new Date() : null,
    },
    create: {
      id: "global",
      killSwitch: enabled,
      killReason: enabled ? reason ?? null : null,
      killedAt: enabled ? new Date() : null,
    },
  });
}

/**
 * Quarantine (or release) an agent version. Quarantined versions are never
 * served as a target and are halted from any in-flight rollout.
 */
export async function setVersionQuarantine(versionId: string, quarantined: boolean, reason?: string) {
  return prisma.agentVersion.update({
    where: { id: versionId },
    data: {
      quarantined,
      ...(quarantined ? { halted: true, haltReason: reason ?? "quarantined" } : {}),
    },
  });
}

/**
 * Forensic mapping: which customers/agents run a given version. Answers
 * "who is exposed to version X?" during an incident (Addendum E.6).
 */
export async function getVersionExposure(version: string) {
  const agents = await prisma.agent.findMany({
    where: { version },
    select: {
      id: true,
      version: true,
      channel: true,
      status: true,
      lastHeartbeatAt: true,
      project: {
        select: {
          id: true,
          name: true,
          organization: { select: { id: true, name: true } },
        },
      },
    },
  });

  const byOrg = new Map<string, { organizationId: string; organizationName: string; agentCount: number }>();
  for (const a of agents) {
    const org = a.project?.organization;
    if (!org) continue;
    const entry = byOrg.get(org.id) ?? {
      organizationId: org.id,
      organizationName: org.name,
      agentCount: 0,
    };
    entry.agentCount += 1;
    byOrg.set(org.id, entry);
  }

  return {
    version,
    totalAgents: agents.length,
    organizations: Array.from(byOrg.values()),
    agents,
  };
}
