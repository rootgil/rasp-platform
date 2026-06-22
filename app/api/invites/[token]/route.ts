import { prisma } from "@/lib/prisma";
import { createAuditLog, jsonError } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";
import { z } from "zod";

const acceptSchema = z.object({
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

/** GET /api/invites/[token] — validate token and return org + email (public) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: { select: { name: true } } },
    });

    if (!invitation) return jsonError("Invitation not found", 404);
    if (invitation.acceptedAt) return jsonError("This invitation has already been used", 410);
    if (invitation.expiresAt < new Date()) return jsonError("This invitation has expired", 410);

    return Response.json({
      email: invitation.email,
      orgName: invitation.organization.name,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

/** POST /api/invites/[token] — accept invitation (creates user + org membership) */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: { select: { id: true, name: true } } },
    });

    if (!invitation) return jsonError("Invitation not found", 404);
    if (invitation.acceptedAt) return jsonError("This invitation has already been used", 410);
    if (invitation.expiresAt < new Date()) return jsonError("This invitation has expired", 410);

    const body = await req.json();
    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const { name, password } = parsed.data;

    // Check if user already exists (may have been created another way)
    let userId: string;
    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const newUser = await prisma.user.create({
        data: {
          email: invitation.email,
          name,
          passwordHash: await bcrypt.hash(password, 12),
          role: "user",
        },
      });
      userId = newUser.id;
    }

    // Add to organization (upsert in case member was removed and re-invited)
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: invitation.organizationId, userId } },
      update: { role: invitation.role },
      create: { organizationId: invitation.organizationId, userId, role: invitation.role },
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    await createAuditLog({
      actorId: userId,
      organizationId: invitation.organizationId,
      action: "member.joined",
      target: invitation.email,
      metadata: { role: invitation.role, via: "invitation" },
    });

    return Response.json({ ok: true, orgName: invitation.organization.name });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
