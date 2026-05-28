import { requireAdmin, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { startCanary, advanceCanary, haltCanary, evaluateCanaryHealth } from "@/modules/rollout/rollout.server";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["start", "advance", "halt", "evaluate"]),
  reason: z.string().optional(),
});

/**
 * Drive the canary state machine for an agent version (Addendum D.3):
 *  - start: begin at 1%
 *  - advance: next stage (1% -> 10% -> 50% -> 100%)
 *  - halt: stop the rollout
 *  - evaluate: run the auto-halt health check now
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    let result;
    switch (parsed.data.action) {
      case "start":
        result = await startCanary(id);
        break;
      case "advance":
        result = await advanceCanary(id);
        break;
      case "halt":
        result = await haltCanary(id, parsed.data.reason ?? "Manual halt");
        break;
      case "evaluate":
        result = await evaluateCanaryHealth(id);
        break;
    }
    if (!result) return jsonError("Version not found", 404);

    await createAuditLog({
      actorId: user.id,
      action: `agent_version.canary_${parsed.data.action}`,
      target: id,
      metadata: { reason: parsed.data.reason },
    });

    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
