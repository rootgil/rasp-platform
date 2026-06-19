import { prisma } from "@/lib/prisma";
import { compileRuleYaml, buildRuleYaml } from "./yaml-compiler";

/** Ensure the project belongs to the given org. Returns null if not found. */
async function assertProjectOwnership(
  projectId: string,
  orgId: string
): Promise<{ id: string } | null> {
  return prisma.project.findFirst({
    where:  { id: projectId, organizationId: orgId },
    select: { id: true },
  });
}

export async function listProjectRules(projectId: string, orgId: string) {
  const project = await assertProjectOwnership(projectId, orgId);
  if (!project) return null;

  return prisma.projectRule.findMany({
    where:   { projectId },
    include: { catalogueRule: { select: { name: true, yamlDefinition: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Add a catalogue rule to a project. The project's YAML is a copy of the
 * catalogue YAML at the time of addition — the user can override it later.
 */
export async function addFromCatalogue(
  projectId: string,
  orgId: string,
  catalogueRuleId: string
) {
  const project = await assertProjectOwnership(projectId, orgId);
  if (!project) return null;

  const rule = await prisma.rule.findUnique({ where: { id: catalogueRuleId } });
  if (!rule) return null;

  const yaml = rule.yamlDefinition ?? buildRuleYaml({
    id:          rule.name,
    name:        rule.name,
    type:        rule.type,
    severity:    rule.severity,
    target:      rule.target,
    pattern:     rule.pattern ?? "",
    description: rule.description,
  });

  return prisma.projectRule.create({
    data: {
      projectId,
      catalogueRuleId,
      source:         "catalogue",
      name:           rule.name,
      type:           rule.type,
      severity:       rule.severity,
      description:    rule.description,
      enabled:        true,
      yamlDefinition: yaml,
      pattern:        rule.pattern,
      target:         rule.target,
    },
  });
}

/**
 * Create a fully custom rule from a user-supplied YAML string.
 */
export async function createCustomRule(
  projectId: string,
  orgId: string,
  yamlDefinition: string
) {
  const project = await assertProjectOwnership(projectId, orgId);
  if (!project) return null;

  const result = compileRuleYaml(yamlDefinition);
  if ("errors" in result) return { errors: result.errors };

  const { spec, yaml } = result;

  return prisma.projectRule.create({
    data: {
      projectId,
      source:         "custom",
      name:           spec.id,
      type:           yaml.type,
      severity:       yaml.severity,
      description:    yaml.description,
      enabled:        yaml.enabled,
      yamlDefinition,
      pattern:        spec.pattern,
      target:         spec.target,
    },
  });
}

/**
 * Update a project rule's YAML (override for catalogue rules, or update for custom).
 * Re-compiles pattern + target from the new YAML.
 */
export async function updateProjectRule(
  id: string,
  orgId: string,
  data: { yamlDefinition?: string; enabled?: boolean }
) {
  const existing = await prisma.projectRule.findFirst({
    where:  { id, project: { organizationId: orgId } },
    select: { id: true },
  });
  if (!existing) return null;

  const updates: Record<string, unknown> = {};

  if (data.enabled !== undefined) {
    updates.enabled = data.enabled;
  }

  if (data.yamlDefinition !== undefined) {
    const result = compileRuleYaml(data.yamlDefinition);
    if ("errors" in result) return { errors: result.errors };

    const { spec, yaml } = result;
    updates.yamlDefinition = data.yamlDefinition;
    updates.pattern        = spec.pattern;
    updates.target         = spec.target;
    updates.severity       = yaml.severity;
    updates.description    = yaml.description ?? null;
    updates.enabled        = yaml.enabled;
  }

  return prisma.projectRule.update({ where: { id }, data: updates });
}

export async function deleteProjectRule(id: string, orgId: string) {
  const existing = await prisma.projectRule.findFirst({
    where:  { id, project: { organizationId: orgId } },
    select: { id: true },
  });
  if (!existing) return null;
  return prisma.projectRule.delete({ where: { id } });
}

/**
 * Accept a catalogue rule notification: create the ProjectRule (copying the
 * catalogue YAML) and mark the notification as accepted.
 */
export async function acceptCatalogueNotification(
  notificationId: string,
  orgId: string
) {
  const notif = await prisma.catalogueRuleNotification.findFirst({
    where:   { id: notificationId, project: { organizationId: orgId } },
    include: { rule: true },
  });
  if (!notif) return null;

  const projectRule = await addFromCatalogue(notif.projectId, orgId, notif.ruleId);

  await prisma.catalogueRuleNotification.update({
    where: { id: notificationId },
    data:  { status: "accepted", resolvedAt: new Date() },
  });

  return projectRule;
}
