import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { getDiscoveredEndpoints } from "@/modules/api-discovery/api-discovery.server";

export async function GET(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const url = new URL(req.url);
    const endpoints = await getDiscoveredEndpoints(orgId, url.searchParams.get("projectId") ?? undefined);
    return Response.json(endpoints);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
