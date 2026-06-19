import { requireSession, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { declineNotification } from "@/modules/project-rules/notifications.server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user   = await requireSession();
    const orgId  = await getOrgId(user.id);

    const result = await declineNotification(id, orgId);
    if (!result) return jsonError("Notification not found", 404);

    await createAuditLog({
      actorId:        user.id,
      organizationId: orgId,
      action:         "catalogue_rule_notification.declined",
      target:         id,
      metadata:       {},
    });

    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
