import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { rollbackToPolicyVersion } from "@/modules/policies/policies.server";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().min(1),
  targetVersion: z.number().int().positive(),
});

/**
 * Control-plane initiated rollback (Addendum D.4): re-publishes a previous
 * policy version as a new signed version. Agents downgrade on their next
 * heartbeat (< 60s).
 */
export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    let policy;
    try {
      policy = await rollbackToPolicyVersion(
        parsed.data.projectId,
        orgId,
        parsed.data.targetVersion
      );
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Rollback failed", 500);
    }
    if (!policy) return jsonError("Target policy version not found", 404);

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "policy.rollback",
      target: policy.id,
      metadata: {
        projectId: policy.projectId,
        rolledBackTo: parsed.data.targetVersion,
        newVersion: policy.version,
      },
    });

    return Response.json(policy, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
