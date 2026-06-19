import { prisma } from "@/lib/prisma";
import { createPolicy } from "@/modules/policies/policies.server";
import { createAuditLog } from "@/lib/auth-helpers";
import { compileRulesOrThrow } from "./yaml-compiler";

export class PublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishError";
  }
}

/**
 * Compile all enabled ProjectRules for the project into a signed Policy version.
 *
 * - Preserves redactionConfig, dataResidency, mode and channel from the latest policy.
 * - Throws PublishError if no enabled rules exist (at least one is required).
 * - Creates an audit log entry on success.
 */
export async function publishProjectRules(
  projectId: string,
  orgId: string,
  actorId: string
) {
  const project = await prisma.project.findFirst({
    where:  { id: projectId, organizationId: orgId },
    select: { id: true },
  });
  if (!project) throw new PublishError("Project not found");

  const projectRules = await prisma.projectRule.findMany({
    where:   { projectId, enabled: true },
    orderBy: { createdAt: "asc" },
  });

  if (projectRules.length === 0) {
    throw new PublishError(
      "At least one enabled detection rule is required before publishing."
    );
  }

  const detectionRules = compileRulesOrThrow(
    projectRules.map((r) => r.yamlDefinition)
  );

  // Preserve fields from the latest policy so partial updates don't wipe them.
  const latest = await prisma.policy.findFirst({
    where:   { projectId },
    orderBy: { version: "desc" },
    select:  { channel: true, mode: true, redactionConfig: true, dataResidency: true, targetAgentVersion: true },
  });

  const policy = await createPolicy(projectId, orgId, {
    channel:            latest?.channel ?? "stable",
    mode:               latest?.mode ?? "monitor",
    detectionRules,
    redactionConfig:    latest?.redactionConfig ?? undefined,
    dataResidency:      latest?.dataResidency ?? undefined,
    targetAgentVersion: latest?.targetAgentVersion ?? undefined,
  });

  if (!policy) throw new PublishError("Failed to create policy");

  await createAuditLog({
    actorId,
    organizationId: orgId,
    action:         "project_rules.publish",
    target:         projectId,
    metadata:       { policyId: policy.id, version: policy.version, ruleCount: detectionRules.length },
  });

  return policy;
}
