import { requireAdmin, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  orgName: z.string().min(1),
  plan: z.enum(["free", "pro", "enterprise"]).default("free"),
  leadId: z.string().optional(),
});

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400);
    }

    const { name, email, orgName, plan, leadId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError("A user with this email already exists", 409);
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [org, user] = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, plan },
      });

      const user = await tx.user.create({
        data: { name, email, passwordHash, role: "user" },
      });

      await tx.organizationMember.create({
        data: { organizationId: org.id, userId: user.id, role: "owner" },
      });

      if (leadId) {
        await tx.contactLead.update({
          where: { id: leadId },
          data: { status: "converted", convertedAt: new Date() },
        });
      }

      return [org, user];
    });

    await createAuditLog({
      actorId: actor.id,
      action: "provision_account",
      target: user.id,
      metadata: { orgId: org.id, email, orgName, plan },
    });

    return Response.json(
      { userId: user.id, orgId: org.id, tempPassword },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
