import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { updateRedactionPolicy } from "@/modules/redaction/redaction.server";
import { z } from "zod";

const patchSchema = z.object({
  mode: z.enum(["denylist", "allowlist", "metadata-only", "local-only"]).optional(),
  rules: z.unknown().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    const policy = await updateRedactionPolicy(id, orgId, parsed.data);
    if (!policy) return jsonError("Not found", 404);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "redaction_policy.update",
      target: id,
      metadata: { mode: parsed.data.mode },
    });
    return Response.json(policy);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
