import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { getRedactionPolicies, createAndPublishRedactionPolicy } from "@/modules/redaction/redaction.server";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string(),
  mode: z.enum(["denylist", "allowlist", "metadata-only", "local-only"]),
  rules: z.unknown().optional(),
});

export async function GET() {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const policies = await getRedactionPolicies(orgId);
    return Response.json(policies);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    const policy = await createAndPublishRedactionPolicy(parsed.data.projectId, orgId, {
      mode: parsed.data.mode,
      rules: parsed.data.rules,
    });
    if (!policy) return jsonError("Project not found", 404);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "redaction_policy.publish",
      target: policy.id,
      metadata: { projectId: parsed.data.projectId, mode: parsed.data.mode },
    });
    return Response.json(policy, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
