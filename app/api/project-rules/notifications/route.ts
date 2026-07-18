import { requireSession, getOrgId, getOrgIdForSession, jsonError } from "@/lib/auth-helpers";
import { getPendingNotifications } from "@/modules/project-rules/notifications.server";

export async function GET() {
  try {
    const user   = await requireSession();
    const orgId  = await getOrgIdForSession(user);
    const result = await getPendingNotifications(orgId);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
