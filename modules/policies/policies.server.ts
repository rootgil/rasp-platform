import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { signPolicy, getSigningKeyId, type SignablePolicy } from "@/lib/policy-signing";

export interface PolicyInput {
  channel?: string;
  mode?: string;
  detectionRules?: unknown;
  redactionConfig?: unknown;
  dataResidency?: unknown;
  targetAgentVersion?: string | null;
}

function asJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return (value ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
}

/**
 * Create and sign a new immutable policy version for a project.
 *
 * The version number is monotonically increasing per project. The signed bytes
 * include the version, which prevents an attacker from replaying an older
 * signed policy (rollback attack).
 */
export async function createPolicy(
  projectId: string,
  organizationId: string,
  input: PolicyInput
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) return null;

  const last = await prisma.policy.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (last?.version ?? 0) + 1;

  const channel = input.channel ?? "stable";
  const mode = input.mode ?? "monitor";
  const targetAgentVersion = input.targetAgentVersion ?? null;

  const signable: SignablePolicy = {
    projectId,
    version,
    channel,
    mode,
    detectionRules: input.detectionRules ?? null,
    redactionConfig: input.redactionConfig ?? null,
    dataResidency: input.dataResidency ?? null,
    targetAgentVersion,
  };

  const signature = signPolicy(signable);
  const signingKeyId = getSigningKeyId();

  return prisma.policy.create({
    data: {
      projectId,
      version,
      channel,
      mode,
      detectionRules: asJson(input.detectionRules),
      redactionConfig: asJson(input.redactionConfig),
      dataResidency: asJson(input.dataResidency),
      targetAgentVersion,
      signature,
      signingKeyId,
    },
  });
}

export async function getPolicy(id: string, organizationId: string) {
  return prisma.policy.findFirst({
    where: { id, project: { organizationId } },
    include: { project: { select: { id: true, name: true } } },
  });
}

export async function listPolicies(organizationId: string, projectId?: string) {
  return prisma.policy.findMany({
    where: {
      project: { organizationId },
      ...(projectId ? { projectId } : {}),
    },
    include: { project: { select: { name: true } } },
    orderBy: [{ projectId: "asc" }, { version: "desc" }],
    take: 200,
  });
}

export async function getLatestPolicy(
  organizationId: string,
  projectId: string,
  channel?: string
) {
  return prisma.policy.findFirst({
    where: {
      projectId,
      project: { organizationId },
      ...(channel ? { channel } : {}),
    },
    orderBy: { version: "desc" },
  });
}

/**
 * Re-publish a previous policy version as a new version (control-plane
 * initiated rollback, Addendum D.4 / E.4.1). Copies the targeted version's
 * payload into a fresh, freshly-signed version so agents pick it up on their
 * next heartbeat.
 */
export async function rollbackToPolicyVersion(
  projectId: string,
  organizationId: string,
  targetVersion: number
) {
  const target = await prisma.policy.findFirst({
    where: { projectId, version: targetVersion, project: { organizationId } },
  });
  if (!target) return null;

  return createPolicy(projectId, organizationId, {
    channel: target.channel,
    mode: target.mode,
    detectionRules: target.detectionRules ?? undefined,
    redactionConfig: target.redactionConfig ?? undefined,
    dataResidency: target.dataResidency ?? undefined,
    targetAgentVersion: target.targetAgentVersion,
  });
}

/**
 * Publish a new signed policy with an updated enforcement mode while preserving
 * the rest of the latest policy payload for the project/channel.
 */
export async function publishEnforcementModeChange(
  projectId: string,
  organizationId: string,
  channel: string,
  mode: "monitor" | "block"
) {
  const latest = await getLatestPolicy(organizationId, projectId, channel);

  return createPolicy(projectId, organizationId, {
    channel,
    mode,
    detectionRules: latest?.detectionRules ?? undefined,
    redactionConfig: latest?.redactionConfig ?? undefined,
    dataResidency: latest?.dataResidency ?? undefined,
    targetAgentVersion: latest?.targetAgentVersion ?? undefined,
  });
}
