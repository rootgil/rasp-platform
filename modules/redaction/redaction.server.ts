import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createPolicy, getLatestPolicy } from "@/modules/policies/policies.server";

/**
 * Translate a dashboard redaction policy (mode + rules) into the policy payload
 * pushed to agents. `metadata-only` and `local-only` modes map to data
 * residency directives; the redaction engine itself stays in denylist/allowlist.
 */
export function buildPolicyFromRedaction(
  mode: string,
  rules: unknown
): { redactionConfig: Record<string, unknown>; dataResidency: Record<string, unknown> | null } {
  const r = (rules ?? {}) as Record<string, unknown>;
  const base = {
    customKeyPatterns: r.customKeyPatterns ?? [],
    allowKeyPatterns: r.allowKeyPatterns ?? [],
    valueRedaction: r.valueRedaction ?? true,
    ipMode: r.ipMode ?? "hash",
  };

  if (mode === "metadata-only") {
    return { redactionConfig: { ...base, mode: "denylist" }, dataResidency: { metadataOnly: true } };
  }
  if (mode === "local-only") {
    return { redactionConfig: { ...base, mode: "denylist" }, dataResidency: { localOnly: true } };
  }
  return { redactionConfig: { ...base, mode }, dataResidency: null };
}

/**
 * Persist the editable redaction policy AND publish a signed policy so the
 * change is distributed to agents. Publishing is best-effort: a missing signing
 * key does not lose the saved record.
 */
export async function createAndPublishRedactionPolicy(
  projectId: string,
  organizationId: string,
  data: { mode: string; rules?: unknown }
) {
  const record = await createRedactionPolicy(projectId, organizationId, data);
  if (!record) return null;

  const { redactionConfig, dataResidency } = buildPolicyFromRedaction(data.mode, data.rules);
  try {
    const latest = await getLatestPolicy(organizationId, projectId);
    await createPolicy(projectId, organizationId, {
      channel: latest?.channel,
      mode: latest?.mode ?? "monitor",
      detectionRules: latest?.detectionRules ?? undefined,
      redactionConfig,
      dataResidency,
      targetAgentVersion: latest?.targetAgentVersion ?? undefined,
    });
  } catch {
    // Signing key may be unconfigured; the editable record is still saved.
  }
  return record;
}

export async function getRedactionPolicies(organizationId: string) {
  return prisma.redactionPolicy.findMany({
    where: { project: { organizationId } },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createRedactionPolicy(
  projectId: string,
  organizationId: string,
  data: { mode: string; rules?: unknown }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;
  return prisma.redactionPolicy.create({
    data: {
      projectId,
      mode: data.mode,
      rules: (data.rules ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
    },
  });
}

export async function updateRedactionPolicy(
  id: string,
  organizationId: string,
  data: { mode?: string; rules?: unknown }
) {
  const policy = await prisma.redactionPolicy.findFirst({
    where: { id, project: { organizationId } },
  });
  if (!policy) return null;
  return prisma.redactionPolicy.update({
    where: { id },
    data: {
      ...(data.mode !== undefined ? { mode: data.mode } : {}),
      ...(data.rules !== undefined
        ? { rules: (data.rules ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue }
        : {}),
    },
  });
}
