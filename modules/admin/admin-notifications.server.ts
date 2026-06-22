import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type AdminNotificationType =
  | "approval.raised"
  | "approval.approved"
  | "approval.rejected";

export async function createAdminNotification(params: {
  type: AdminNotificationType;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.adminNotification.create({
    data: {
      type: params.type,
      relatedId: params.relatedId ?? null,
      metadata: params.metadata ?? Prisma.JsonNull,
    },
  });
}

export async function getAdminNotifications() {
  const notifications = await prisma.adminNotification.findMany({
    where: { status: "unread" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return { notifications, unreadCount: notifications.length };
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  await prisma.adminNotification.updateMany({
    where: { status: "unread" },
    data: { status: "read", readAt: new Date() },
  });
}
