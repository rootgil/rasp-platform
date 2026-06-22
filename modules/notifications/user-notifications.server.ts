import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type UserNotificationType =
  | "kill_switch.enabled"
  | "kill_switch.disabled"
  | "agent_version.quarantined"
  | "agent_version.rolledback";

/** Create one notification per organization for platform-wide events (e.g. kill-switch). */
export async function notifyAllOrgs(params: {
  type: UserNotificationType;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  if (orgs.length === 0) return;
  await prisma.userNotification.createMany({
    data: orgs.map((o) => ({
      orgId: o.id,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      metadata: params.metadata ?? Prisma.JsonNull,
    })),
    skipDuplicates: false,
  });
}

/** Create one notification per affected project for version-level events. */
export async function notifyAffectedProjects(params: {
  projectIds: string[];
  type: UserNotificationType;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (params.projectIds.length === 0) return;
  await prisma.userNotification.createMany({
    data: params.projectIds.map((pid) => ({
      projectId: pid,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      metadata: params.metadata ?? Prisma.JsonNull,
    })),
    skipDuplicates: false,
  });
}

export interface UserNotificationItem {
  id:        string;
  type:      string;
  title:     string;
  body:      string | null;
  metadata:  Prisma.JsonValue | null;
  createdAt: Date;
  orgId:     string | null;
  projectId: string | null;
}

/** Return all unread notifications relevant to the given org's users. */
export async function getUserNotificationsForOrg(orgId: string): Promise<{
  notifications: UserNotificationItem[];
  unreadCount: number;
}> {
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  const notifications = await prisma.userNotification.findMany({
    where: {
      status: "unread",
      OR: [
        { orgId },
        ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      metadata: true,
      createdAt: true,
      orgId: true,
      projectId: true,
    },
  });

  return { notifications, unreadCount: notifications.length };
}

/** Mark a single notification as read, scoped to the caller's org. */
export async function markUserNotificationRead(
  id: string,
  orgId: string
): Promise<void> {
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  await prisma.userNotification.updateMany({
    where: {
      id,
      status: "unread",
      OR: [
        { orgId },
        ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
      ],
    },
    data: { status: "read", readAt: new Date() },
  });
}
