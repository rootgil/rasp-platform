import { requireAdmin, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { approveRequest, rejectRequest } from "@/modules/admin/approvals.server";
import { createAdminNotification } from "@/modules/admin/admin-notifications.server";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(2000).optional(),
});

/**
 * POST /api/admin/approvals/:id - approve or reject a request. Enforces
 * separation of duties: approver must differ from requester (Addendum E.4.3).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    const orgId = await getOrgId(user.id).catch(() => undefined);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    try {
      const result =
        parsed.data.action === "approve"
          ? await approveRequest(id, user.id)
          : await rejectRequest(id, user.id, parsed.data.reason);
      await createAuditLog({
        actorId: user.id,
        organizationId: orgId,
        action: `approval.${parsed.data.action}`,
        target: id,
      });
      createAdminNotification({
        type: parsed.data.action === "approve" ? "approval.approved" : "approval.rejected",
        relatedId: id,
        metadata: { resolvedByEmail: user.email },
      }).catch(() => {});
      return Response.json({ request: result });
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Approval failed", 400);
    }
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
