import { prisma } from "@/lib/prisma";
import { getLatestPolicy } from "@/modules/policies/policies.server";
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
 * catalogue YAML at the time of addition - the user can override it later.
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

  const yaml = buildRuleYaml({
    id:          rule.name,
    name:        rule.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    type:        rule.type,
    severity:    rule.severity,
    target:      rule.target,
    pattern:     rule.pattern ?? "",
    description: rule.description,
    enabled:     true,
  });

  const compiled = compileRuleYaml(yaml);
  const canonicalYaml = "errors" in compiled
    ? yaml
    : buildRuleYaml({
        id:          compiled.spec.id,
        name:        compiled.spec.name,
        type:        compiled.yaml.type,
        severity:    compiled.yaml.severity,
        target:      compiled.spec.target,
        pattern:     compiled.spec.pattern,
        description: compiled.spec.description,
        enabled:     true,
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
      yamlDefinition: canonicalYaml,
      pattern:        "errors" in compiled ? rule.pattern : compiled.spec.pattern,
      target:         "errors" in compiled ? rule.target  : compiled.spec.target,
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

  const canonicalYaml = buildRuleYaml({
    id:          spec.id,
    name:        spec.name,
    type:        yaml.type,
    severity:    yaml.severity,
    target:      spec.target,
    pattern:     spec.pattern,
    description: yaml.description,
    enabled:     yaml.enabled,
  });

  return prisma.projectRule.create({
    data: {
      projectId,
      source:         "custom",
      name:           spec.id,
      type:           yaml.type,
      severity:       yaml.severity,
      description:    yaml.description,
      enabled:        yaml.enabled,
      yamlDefinition: canonicalYaml,
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
    updates.yamlDefinition = buildRuleYaml({
      id:          spec.id,
      name:        spec.name,
      type:        yaml.type,
      severity:    yaml.severity,
      target:      spec.target,
      pattern:     spec.pattern,
      description: yaml.description,
      enabled:     yaml.enabled,
    });
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

type DetectionRuleRef = { id?: string; name?: string };

/** Whether enabled project rules differ from the latest signed policy. */
export async function getPublishStatus(projectId: string, orgId: string) {
  const project = await assertProjectOwnership(projectId, orgId);
  if (!project) return null;

  const enabledRules = await prisma.projectRule.findMany({
    where:  { projectId, enabled: true },
    select: { name: true },
  });

  const latestPolicy =
    (await getLatestPolicy(orgId, projectId, "stable")) ??
    (await getLatestPolicy(orgId, projectId));

  if (enabledRules.length === 0) {
    return {
      latestVersion:  latestPolicy?.version ?? null,
      needsPublish:   false,
      enabledCount:   0,
      publishedCount: Array.isArray(latestPolicy?.detectionRules)
        ? (latestPolicy!.detectionRules as unknown[]).length
        : 0,
    };
  }

  if (!latestPolicy) {
    return {
      latestVersion:  null,
      needsPublish:   true,
      enabledCount:   enabledRules.length,
      publishedCount: 0,
    };
  }

  const detectionRules = Array.isArray(latestPolicy.detectionRules)
    ? (latestPolicy.detectionRules as DetectionRuleRef[])
    : [];

  const allPublished = enabledRules.every((rule) =>
    detectionRules.some((dr) => dr.id === rule.name || dr.name === rule.name)
  );
  const countsMatch = detectionRules.length === enabledRules.length;

  return {
    latestVersion:  latestPolicy.version,
    needsPublish:   !allPublished || !countsMatch,
    enabledCount:   enabledRules.length,
    publishedCount: detectionRules.length,
  };
}
