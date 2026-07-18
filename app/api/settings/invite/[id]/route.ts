import { requireSession, getOrgId, getOrgIdForSession, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

/** DELETE /api/settings/invite/[id] — revoke a pending invitation (owner only). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    await requireOrgRole(user.id, orgId, ["owner"]);

    const invitation = await prisma.invitation.findFirst({
      where: {
        id,
        organizationId: orgId,
        acceptedAt: null,
      },
      select: { id: true, email: true, role: true },
    });
    if (!invitation) return jsonError("Invitation not found", 404);

    await prisma.invitation.delete({ where: { id: invitation.id } });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "member.invite_revoke",
      target: invitation.email,
      metadata: { role: invitation.role, invitationId: invitation.id },
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
