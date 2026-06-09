import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { getPolicy } from "@/modules/policies/policies.server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const policy = await getPolicy(id, orgId);
    if (!policy) return jsonError("Not found", 404);
    return Response.json(policy);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
