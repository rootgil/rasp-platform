import { prisma } from "@/lib/prisma";

/**
 * Create one CatalogueRuleNotification per existing project when the admin
 * adds a new catalogue rule. Called from POST /api/rules after Rule creation.
 */
export async function createNotificationsForNewRule(ruleId: string): Promise<void> {
  const projects = await prisma.project.findMany({ select: { id: true } });
  if (projects.length === 0) return;

  await prisma.catalogueRuleNotification.createMany({
    data: projects.map((p) => ({ ruleId, projectId: p.id })),
    skipDuplicates: true,
  });
}

export interface PendingNotification {
  id:        string;
  projectId: string;
  createdAt: Date;
  rule: {
    id:             string;
    name:           string;
    type:           string;
    severity:       string;
    description:    string | null;
    yamlDefinition: string | null;
  };
  project: {
    id:   string;
    name: string;
  };
}

/**
 * When a new project is created, backfill notifications for all currently
 * enabled catalogue rules so the new project sees the opt-in queue immediately.
 */
export async function backfillNotificationsForProject(projectId: string): Promise<void> {
  const enabledRules = await prisma.rule.findMany({
    where: { enabled: true },
    select: { id: true },
  });
  if (enabledRules.length === 0) return;

  await prisma.catalogueRuleNotification.createMany({
    data: enabledRules.map((r) => ({ ruleId: r.id, projectId })),
    skipDuplicates: true,
  });
}

/**
 * Return all pending notifications for projects belonging to the given org.
 */
export async function getPendingNotifications(
  orgId: string
): Promise<{ notifications: PendingNotification[]; totalCount: number }> {
  const notifications = await prisma.catalogueRuleNotification.findMany({
    where: {
      status:  "pending",
      project: { organizationId: orgId },
    },
    include: {
      rule:    { select: { id: true, name: true, type: true, severity: true, description: true, yamlDefinition: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { notifications, totalCount: notifications.length };
}

/**
 * Mark a notification as seen (called when the user opens the Bell dropdown).
 */
export async function markNotificationSeen(id: string, orgId: string): Promise<void> {
  await prisma.catalogueRuleNotification.updateMany({
    where: { id, project: { organizationId: orgId }, status: "pending" },
    data:  { seenAt: new Date() },
  });
}

/**
 * Resolve a notification as declined.
 */
export async function declineNotification(
  id: string,
  orgId: string
): Promise<{ id: string } | null> {
  const notif = await prisma.catalogueRuleNotification.findFirst({
    where: { id, project: { organizationId: orgId } },
  });
  if (!notif) return null;

  return prisma.catalogueRuleNotification.update({
    where: { id },
    data:  { status: "declined", resolvedAt: new Date() },
    select: { id: true },
  });
}
