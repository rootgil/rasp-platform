import { requireSession, getOrgId, getOrgIdForSession, jsonError } from "@/lib/auth-helpers";
import { getEvents } from "@/modules/events/events.server";

export async function GET(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const url = new URL(req.url);
    const filters = {
      severity: url.searchParams.get("severity") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      projectId: url.searchParams.get("projectId") ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      page: parseInt(url.searchParams.get("page") ?? "0"),
      pageSize: parseInt(url.searchParams.get("pageSize") ?? "50"),
    };
    const result = await getEvents(orgId, filters);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
