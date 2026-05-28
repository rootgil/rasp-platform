import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ── Global catalogue (backoffice) ─────────────────────────────────────────────

export async function getRules() {
  return prisma.rule.findMany({
    include: {
      _count: { select: { projectRules: { where: { enabled: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getRule(id: string) {
  return prisma.rule.findUnique({ where: { id } });
}

export async function createRule(data: {
  name: string;
  type: string;
  severity?: string;
  description?: string;
  enabled?: boolean;
  config?: unknown;
}) {
  return prisma.rule.create({
    data: {
      name: data.name,
      type: data.type,
      severity: data.severity ?? "medium",
      description: data.description ?? null,
      enabled: data.enabled ?? true,
      config: (data.config ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
    },
  });
}

export async function updateRule(
  id: string,
  data: { name?: string; severity?: string; description?: string; enabled?: boolean; config?: unknown }
) {
  const rule = await prisma.rule.findUnique({ where: { id } });
  if (!rule) return null;
  return prisma.rule.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.severity !== undefined ? { severity: data.severity } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      ...(data.config !== undefined
        ? { config: (data.config ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue }
        : {}),
    },
  });
}

export async function deleteRule(id: string) {
  const rule = await prisma.rule.findUnique({ where: { id } });
  if (!rule) return null;
  return prisma.rule.delete({ where: { id } });
}

// ── Per-project overrides (dashboard) ────────────────────────────────────────

export type RuleWithEffectiveEnabled = {
  id: string;
  name: string;
  type: string;
  severity: string;
  description: string | null;
  globalEnabled: boolean;
  projectEnabled: boolean;
  effectiveEnabled: boolean;
  config: Prisma.JsonValue;
  createdAt: Date;
};

/**
 * Returns the full global catalogue annotated with the effective enabled state
 * for the given project. A rule is effective if both the global flag and the
 * per-project override are enabled (or no override exists, falling back to global).
 */
export async function getRulesForProject(
  projectId: string,
  organizationId: string
): Promise<RuleWithEffectiveEnabled[]> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return [];

  const [rules, overrides] = await Promise.all([
    prisma.rule.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.projectRule.findMany({ where: { projectId } }),
  ]);

  const overrideMap = new Map(overrides.map((o) => [o.ruleId, o.enabled]));

  return rules.map((rule) => {
    const projectEnabled = overrideMap.has(rule.id)
      ? (overrideMap.get(rule.id) as boolean)
      : rule.enabled;
    return {
      id: rule.id,
      name: rule.name,
      type: rule.type,
      severity: rule.severity,
      description: rule.description,
      globalEnabled: rule.enabled,
      projectEnabled,
      effectiveEnabled: rule.enabled && projectEnabled,
      config: rule.config,
      createdAt: rule.createdAt,
    };
  });
}

/**
 * Upserts a ProjectRule override. Verifies project belongs to the organization.
 */
export async function setProjectRuleEnabled(
  projectId: string,
  ruleId: string,
  organizationId: string,
  enabled: boolean
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return false;

  const rule = await prisma.rule.findUnique({ where: { id: ruleId } });
  if (!rule) return false;

  await prisma.projectRule.upsert({
    where: { projectId_ruleId: { projectId, ruleId } },
    create: { projectId, ruleId, enabled },
    update: { enabled },
  });
  return true;
}
