import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { publishProjectRules, PublishError } from "@/modules/project-rules/publish";
import { RuleCompileError } from "@/modules/project-rules/yaml-compiler";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const user   = await requireSession();
    const orgId  = await getOrgIdForSession(user);
    await requireOrgRole(user.id, orgId, ["owner"]);
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const policy = await publishProjectRules(parsed.data.projectId, orgId, user.id);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "project_rules.publish",
      target: parsed.data.projectId,
      metadata: { policyVersion: (policy as { version?: number })?.version },
    });
    return Response.json(policy, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    if (e instanceof PublishError) return jsonError(e.message, 400);
    if (e instanceof RuleCompileError) return jsonError(e.message, 400);
    console.error("[POST /api/project-rules/publish]", e);
    return jsonError("Internal server error", 500);
  }
}
