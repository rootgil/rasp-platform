import { requireAdmin, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { rollbackVersion } from "@/modules/rollout/rollout.server";
import { z } from "zod";

const schema = z.object({ reason: z.string().min(1) });

/**
 * Roll back an agent version (Addendum D.4): halt + deprecate it and advertise
 * the previous version to every affected agent. Records MTTR.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const result = await rollbackVersion(id, parsed.data.reason);
    if (!result) return jsonError("Version not found", 404);

    await createAuditLog({
      actorId: user.id,
      action: "agent_version.rollback",
      target: id,
      metadata: { reason: parsed.data.reason, ...result },
    });

    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
