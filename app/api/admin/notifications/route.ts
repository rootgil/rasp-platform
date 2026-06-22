import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import {
  getAdminNotifications,
  markAllAdminNotificationsRead,
} from "@/modules/admin/admin-notifications.server";

/** GET /api/admin/notifications - unread admin broadcast notifications. */
export async function GET() {
  try {
    await requireAdmin();
    const data = await getAdminNotifications();
    return Response.json(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

/** POST /api/admin/notifications - mark all notifications as read. */
export async function POST() {
  try {
    await requireAdmin();
    await markAllAdminNotificationsRead();
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
