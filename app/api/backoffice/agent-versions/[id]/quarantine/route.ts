import { requireAdmin, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { setVersionQuarantine } from "@/modules/admin/incident.server";
import { requireApproval, markExecuted } from "@/modules/admin/approvals.server";
import { z } from "zod";

const schema = z.object({
  quarantined: z.boolean(),
  reason: z.string().max(2000).optional(),
});

/**
 * POST /api/backoffice/agent-versions/:id/quarantine — quarantine or release a
 * version (Addendum E.6). Quarantining requires a prior dual-authorization.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    const orgId = await getOrgId(user.id).catch(() => undefined);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    if (parsed.data.quarantined) {
      try {
        const approval = await requireApproval({
          action: "agent_version.quarantine",
          target: id,
          executorId: user.id,
        });
        await markExecuted(approval.id);
      } catch (err) {
        return jsonError(err instanceof Error ? err.message : "Approval required", 403);
      }
    }

    const version = await setVersionQuarantine(id, parsed.data.quarantined, parsed.data.reason);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: parsed.data.quarantined ? "agent_version.quarantined" : "agent_version.released",
      target: id,
      metadata: { reason: parsed.data.reason },
    });
    return Response.json({ version });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
