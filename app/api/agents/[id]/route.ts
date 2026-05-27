import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { getAgent } from "@/modules/agents/agents.server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const agent = await getAgent(id, orgId);
    if (!agent) return jsonError("Not found", 404);
    return Response.json(agent);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
