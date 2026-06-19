import { requireSession, requireAdmin, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { getRules, createRule } from "@/modules/rules/rules.server";
import { createNotificationsForNewRule } from "@/modules/project-rules/notifications.server";
import { z } from "zod";

const createSchema = z.object({
  name:           z.string().min(1),
  type:           z.string().min(1),
  severity:       z.enum(["critical", "high", "medium", "low"]).default("medium"),
  description:    z.string().optional(),
  enabled:        z.boolean().default(true),
  config:         z.unknown().optional(),
  // YAML-driven fields
  pattern:        z.string().optional(),
  target:         z.string().optional(),
  yamlDefinition: z.string().optional(),
});

export async function GET() {
  try {
    await requireSession();
    const rules = await getRules();
    return Response.json(rules);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    const rule = await createRule(parsed.data);
    await createAuditLog({
      actorId: user.id,
      action: "rule.create",
      target: rule.id,
      metadata: { name: rule.name, type: rule.type, severity: rule.severity },
    });
    // Notify all existing projects about the new catalogue rule (opt-in flow)
    createNotificationsForNewRule(rule.id).catch(() => {});
    return Response.json(rule, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
