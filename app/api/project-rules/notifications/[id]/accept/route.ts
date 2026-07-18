import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { acceptCatalogueNotification } from "@/modules/project-rules/project-rules.server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user   = await requireSession();
    const orgId  = await getOrgIdForSession(user);

    const result = await acceptCatalogueNotification(id, orgId);
    if (!result) return jsonError("Notification not found", 404);

    await createAuditLog({
      actorId:        user.id,
      organizationId: orgId,
      action:         "catalogue_rule_notification.accepted",
      target:         id,
      metadata:       {},
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
