import { prisma } from "@/lib/prisma";

/**
 * Agent version rollout - canary state machine (Addendum D.3-D.5).
 *
 * Stages map to a rollout percentage of the channel's agents:
 *   0 = not started, 1 = 1%, 2 = 10%, 3 = 50%, 4 = 100%.
 *
 * Each stage records a {@link RolloutMetric} row so the platform can compute
 * KPIs (success rate, MTTR, canary catch-rate, uptime). An unhealthy stage is
 * halted automatically (see {@link evaluateCanaryHealth}) and can be rolled
 * back, which advertises the previous version to affected agents.
 */
export const STAGE_PERCENT = [0, 1, 10, 50, 100] as const;

/** Stable 0-99 bucket for an agent id (FNV-1a based). Mirrors the collector. */
export function cohortBucket(agentId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < agentId.length; i++) {
    h ^= agentId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

export function isInCohort(agentId: string, percent: number): boolean {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return cohortBucket(agentId) < percent;
}

/** Start the canary at stage 1 (1%). */
export async function startCanary(versionId: string) {
  const v = await prisma.agentVersion.findUnique({ where: { id: versionId } });
  if (!v || v.quarantined) return null;

  const updated = await prisma.agentVersion.update({
    where: { id: versionId },
    data: {
      status: "published",
      rolloutStage: 1,
      rolloutPercent: STAGE_PERCENT[1],
      rolloutStartedAt: new Date(),
      halted: false,
      haltReason: null,
      releasedAt: v.releasedAt ?? new Date(),
    },
  });
  await prisma.rolloutMetric.create({
    data: { versionId, stage: 1 },
  });
  return updated;
}

/** Advance to the next canary stage (cannot advance a halted rollout). */
export async function advanceCanary(versionId: string) {
  const v = await prisma.agentVersion.findUnique({ where: { id: versionId } });
  if (!v) return null;
  if (v.halted || v.quarantined) return v;
  if (v.rolloutStage >= 4) return v;

  const stage = v.rolloutStage + 1;
  const updated = await prisma.agentVersion.update({
    where: { id: versionId },
    data: { rolloutStage: stage, rolloutPercent: STAGE_PERCENT[stage] },
  });
  await prisma.rolloutMetric.create({ data: { versionId, stage } });
  return updated;
}

/** Halt the canary (manual or automatic). */
export async function haltCanary(versionId: string, reason: string) {
  const v = await prisma.agentVersion.findUnique({ where: { id: versionId } });
  if (!v) return null;
  const updated = await prisma.agentVersion.update({
    where: { id: versionId },
    data: { halted: true, haltReason: reason },
  });
  await prisma.rolloutMetric.updateMany({
    where: { versionId, stage: v.rolloutStage, haltedAt: null },
    data: { haltedAt: new Date() },
  });
  return updated;
}

/**
 * Auto-halt heuristic: count critical/high security events emitted by agents in
 * the current canary cohort since the rollout started. If the rate exceeds the
 * budget, halt the rollout. Returns the decision.
 */
const ERROR_BUDGET = 5;

export async function evaluateCanaryHealth(versionId: string): Promise<{
  halted: boolean;
  errorEvents: number;
}> {
  const v = await prisma.agentVersion.findUnique({ where: { id: versionId } });
  if (!v || v.halted || !v.rolloutStartedAt) return { halted: false, errorEvents: 0 };

  // Agents currently targeting this version on its channel.
  const agents = await prisma.agent.findMany({
    where: { channel: v.channel, targetVersion: v.version },
    select: { id: true },
  });
  const agentIds = agents.map((a) => a.id);

  const errorEvents = agentIds.length
    ? await prisma.securityEvent.count({
        where: {
          agentId: { in: agentIds },
          severity: { in: ["critical", "high"] },
          createdAt: { gte: v.rolloutStartedAt },
        },
      })
    : 0;

  await prisma.rolloutMetric.updateMany({
    where: { versionId, stage: v.rolloutStage },
    data: { errorEvents, agentsTargeted: agentIds.length },
  });

  if (errorEvents > ERROR_BUDGET) {
    await haltCanary(versionId, `Auto-halt: ${errorEvents} critical/high events in canary cohort`);
    return { halted: true, errorEvents };
  }
  return { halted: false, errorEvents };
}

/**
 * Roll a version back: halt it, deprecate it, and advertise the previous
 * version to every agent that was targeting it. Records MTTR.
 */
export async function rollbackVersion(versionId: string, reason: string) {
  const v = await prisma.agentVersion.findUnique({ where: { id: versionId } });
  if (!v) return null;

  await haltCanary(versionId, reason);
  await prisma.agentVersion.update({
    where: { id: versionId },
    data: { status: "deprecated" },
  });

  // Move affected agents back to their previous version.
  const affected = await prisma.agent.findMany({
    where: { targetVersion: v.version },
    select: { id: true, previousVersion: true },
  });
  await Promise.all(
    affected.map((a) =>
      prisma.agent.update({
        where: { id: a.id },
        data: {
          targetVersion: a.previousVersion ?? null,
          upgradeStatus: "rolledback",
          lastUpgradeAt: new Date(),
        },
      })
    )
  );

  const mttrSeconds = v.rolloutStartedAt
    ? Math.round((Date.now() - v.rolloutStartedAt.getTime()) / 1000)
    : null;
  await prisma.rolloutMetric.updateMany({
    where: { versionId, stage: v.rolloutStage },
    data: { rolledBackAt: new Date(), mttrSeconds: mttrSeconds ?? undefined },
  });

  return { rolledBack: affected.length, mttrSeconds };
}

/** All agent versions (backoffice catalogue), newest first. */
export async function listAgentVersions() {
  return prisma.agentVersion.findMany({ orderBy: { createdAt: "desc" } });
}

/** Published agent versions, optionally filtered by channel. */
export async function listPublishedVersions(channel?: string) {
  return prisma.agentVersion.findMany({
    where: {
      status: "published",
      ...(channel ? { channel } : {}),
    },
    orderBy: { releasedAt: "desc" },
  });
}

/** Aggregate rollout KPIs across all versions (Addendum D.5). */
export async function getRolloutKpis() {
  const [versions, metrics] = await Promise.all([
    prisma.agentVersion.findMany({ select: { id: true, halted: true, rolloutStage: true } }),
    prisma.rolloutMetric.findMany(),
  ]);

  const totalRollouts = versions.filter((v) => v.rolloutStage > 0).length || 1;
  const haltedDuringCanary = versions.filter((v) => v.halted && v.rolloutStage < 4).length;
  const completed = versions.filter((v) => !v.halted && v.rolloutStage >= 4).length;

  const mttrs = metrics.map((m) => m.mttrSeconds).filter((x): x is number => x != null);
  const avgMttr = mttrs.length ? Math.round(mttrs.reduce((a, b) => a + b, 0) / mttrs.length) : null;

  return {
    totalRollouts: versions.filter((v) => v.rolloutStage > 0).length,
    completed,
    successRate: Math.round((completed / totalRollouts) * 100),
    canaryCatchRate: Math.round((haltedDuringCanary / totalRollouts) * 100),
    avgMttrSeconds: avgMttr,
  };
}
