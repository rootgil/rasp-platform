import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { getAgents } from "@/modules/agents/agents.server";

export async function GET() {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const agents = await getAgents(orgId);
    return Response.json(agents);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
