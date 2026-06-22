import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { markUserNotificationRead } from "@/modules/notifications/user-notifications.server";

/** POST /api/user-notifications/:id/read - mark a notification as read. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user  = await requireSession();
    const orgId = await getOrgId(user.id);
    const { id } = await params;
    await markUserNotificationRead(id, orgId);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
