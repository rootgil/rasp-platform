import { requireAdmin, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { listApprovals, raiseApproval } from "@/modules/admin/approvals.server";
import { createAdminNotification } from "@/modules/admin/admin-notifications.server";
import { z } from "zod";

const createSchema = z.object({
  action: z.enum([
    "agent_version.rollback",
    "agent_version.quarantine",
    "platform.kill_switch",
    "tenant.crypto_shred",
  ]),
  target: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().max(2000).optional(),
});

/** GET /api/admin/approvals?status=pending - list dual-authorization requests. */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const requests = await listApprovals(status);
    return Response.json({ requests });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

/** POST /api/admin/approvals - raise a sensitive-action request for approval. */
export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const orgId = await getOrgId(user.id).catch(() => undefined);
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const request = await raiseApproval({
      action: parsed.data.action,
      target: parsed.data.target,
      payload: parsed.data.payload,
      requestedById: user.id,
      reason: parsed.data.reason,
    });
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "approval.raised",
      target: request.id,
      metadata: { action: parsed.data.action, target: parsed.data.target },
    });
    createAdminNotification({
      type: "approval.raised",
      relatedId: request.id,
      metadata: {
        action:        parsed.data.action,
        target:        parsed.data.target,
        raisedByEmail: user.email,
        reason:        parsed.data.reason,
      },
    }).catch(() => {});
    return Response.json({ request }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
