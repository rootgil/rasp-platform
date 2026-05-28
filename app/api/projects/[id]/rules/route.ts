import { requireSession, getOrgId, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { getRulesForProject, setProjectRuleEnabled } from "@/modules/rules/rules.server";
import { z } from "zod";

const patchSchema = z.object({
  ruleId: z.string().min(1),
  enabled: z.boolean(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const rules = await getRulesForProject(projectId, orgId);
    return Response.json(rules);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const ok = await setProjectRuleEnabled(
      projectId,
      parsed.data.ruleId,
      orgId,
      parsed.data.enabled
    );
    if (!ok) return jsonError("Project or rule not found", 404);

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "project_rule.update",
      target: projectId,
      metadata: { ruleId: parsed.data.ruleId, enabled: parsed.data.enabled },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
