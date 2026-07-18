import { requireSession, getOrgId, getOrgIdForSession, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { updateAlert } from "@/modules/alerts/alerts.server";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["open", "investigating", "resolved"]).optional(),
  assignedTo: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    const alert = await updateAlert(id, orgId, parsed.data);
    if (!alert) return jsonError("Not found", 404);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "alert.update",
      target: id,
      metadata: parsed.data,
    });
    return Response.json(alert);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
