import { requireSession, getOrgId, getOrgIdForSession, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["owner", "member"]),
});

/** PATCH /api/settings/members/[id] — change an org member role (owner only). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    await requireOrgRole(user.id, orgId, ["owner"]);

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const member = await prisma.organizationMember.findFirst({
      where: { id, organizationId: orgId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!member) return jsonError("Member not found", 404);

    const nextRole = parsed.data.role;
    if (member.role === nextRole) {
      return Response.json({ id: member.id, role: member.role });
    }

    // Prevent leaving the org without an owner.
    if (member.role === "owner" && nextRole !== "owner") {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: "owner" },
      });
      if (ownerCount <= 1) {
        return jsonError("Cannot demote the last organization owner", 400);
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: member.id },
      data: { role: nextRole },
      select: { id: true, role: true, userId: true },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "member.role_change",
      target: member.user.email,
      metadata: {
        membershipId: member.id,
        from: member.role,
        to: nextRole,
      },
    });

    return Response.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
