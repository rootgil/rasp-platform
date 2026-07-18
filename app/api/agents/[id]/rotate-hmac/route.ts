import { requireSession, getOrgIdForSession, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { rotateAgentHmacSecret } from "@/modules/agents/agents.server";

/**
 * POST /api/agents/:id/rotate-hmac
 * Owner-only. Issues a new HMAC secret shown once in the response.
 * The previous secret is overwritten and cannot be recovered.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    await requireOrgRole(user.id, orgId, ["owner"]);

    const result = await rotateAgentHmacSecret(id, orgId);
    if (!result) return jsonError("Not found", 404);

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "agent.hmac.rotate",
      target: id,
    });

    return Response.json({
      hmacSecret: result.hmacSecret,
      message: "New HMAC secret issued. Copy it now — it will not be shown again.",
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
