import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { getUserNotificationsForOrg } from "@/modules/notifications/user-notifications.server";

/** GET /api/user-notifications - operational notifications for the caller's org. */
export async function GET() {
  try {
    const user  = await requireSession();
    const orgId = await getOrgId(user.id);
    const data  = await getUserNotificationsForOrg(orgId);
    return Response.json(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
