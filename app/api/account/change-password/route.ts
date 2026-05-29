import { requireSession, createAuditLog, jsonError, jsonOk } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const user = await requireSession();

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { currentPassword, newPassword } = parsed.data;

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return jsonError("User not found", 404);

    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!valid) return jsonError("Current password is incorrect", 400);

    if (currentPassword === newPassword) {
      return jsonError("New password must be different from current password", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "user.password_changed",
      target: user.id,
    });

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
