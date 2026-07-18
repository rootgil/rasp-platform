import { requireSession, getOrgId, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["member", "admin", "owner"]).default("member"),
});

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);

    // Only org owners can invite
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    });
    if (membership?.role !== "owner") {
      return jsonError("Only organization owners can send invitations", 403);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const { email, role } = parsed.data;

    // Prevent inviting someone who is already a member
    const existing = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, user: { email } },
    });
    if (existing) return jsonError("This email is already a member of your organization", 409);

    // Invalidate any pending invite for the same email + org
    await prisma.invitation.deleteMany({
      where: { organizationId: orgId, email, acceptedAt: null },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invitation = await prisma.invitation.create({
      data: { email, organizationId: orgId, role, token, invitedById: user.id, expiresAt },
      include: { organization: { select: { name: true } }, invitedBy: { select: { name: true, email: true } } },
    });

    await sendInviteEmail({
      to: email,
      orgName: invitation.organization.name,
      invitedBy: invitation.invitedBy.name ?? invitation.invitedBy.email,
      token,
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "member.invite",
      target: email,
      metadata: { role },
    });

    return Response.json({ id: invitation.id, email, expiresAt }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function GET() {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);

    const invitations = await prisma.invitation.findMany({
      where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true,
        invitedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ invitations });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
