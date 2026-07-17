import { requireSession, getOrgId, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { revokeApiKey } from "@/modules/api-keys/api-keys.server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    await requireOrgRole(user.id, orgId, ["owner"]);
    const key = await revokeApiKey(id, orgId);
    if (!key) return jsonError("Not found", 404);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "api_key.revoke",
      target: id,
    });
    return Response.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
