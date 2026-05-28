import { requireAdmin, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { updateRule, deleteRule } from "@/modules/rules/rules.server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  config: z.unknown().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAdmin();
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    const rule = await updateRule(id, parsed.data);
    if (!rule) return jsonError("Not found", 404);
    await createAuditLog({
      actorId: user.id,
      action: "rule.update",
      target: id,
      metadata: parsed.data as Record<string, unknown>,
    });
    return Response.json(rule);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAdmin();
    const rule = await deleteRule(id);
    if (!rule) return jsonError("Not found", 404);
    await createAuditLog({
      actorId: user.id,
      action: "rule.delete",
      target: id,
      metadata: { name: rule.name, type: rule.type },
    });
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
