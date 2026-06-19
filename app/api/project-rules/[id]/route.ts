import { requireSession, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { updateProjectRule, deleteProjectRule } from "@/modules/project-rules/project-rules.server";
import { formatRuleCompileErrors } from "@/modules/project-rules/rule-yaml-help";
import { z } from "zod";

const patchSchema = z.object({
  yamlDefinition: z.string().min(1).optional(),
  enabled:        z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user   = await requireSession();
    const orgId  = await getOrgId(user.id);
    const body   = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const result = await updateProjectRule(id, orgId, parsed.data);
    if (result === null) return jsonError("Rule not found", 404);
    if (result && "errors" in result) return jsonError(formatRuleCompileErrors(result.errors), 400);

    await createAuditLog({
      actorId:        user.id,
      organizationId: orgId,
      action:         "project_rule.update",
      target:         id,
      metadata:       parsed.data as Record<string, unknown>,
    });

    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user   = await requireSession();
    const orgId  = await getOrgId(user.id);

    const result = await deleteProjectRule(id, orgId);
    if (!result) return jsonError("Rule not found", 404);

    await createAuditLog({
      actorId:        user.id,
      organizationId: orgId,
      action:         "project_rule.delete",
      target:         id,
      metadata:       {},
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
