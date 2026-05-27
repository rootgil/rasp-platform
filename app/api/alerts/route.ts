import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { getAlerts } from "@/modules/alerts/alerts.server";

export async function GET(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const url = new URL(req.url);
    const alerts = await getAlerts(orgId, {
      status: url.searchParams.get("status") ?? undefined,
      severity: url.searchParams.get("severity") ?? undefined,
    });
    return Response.json(alerts);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
