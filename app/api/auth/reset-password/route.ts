import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

/** POST /api/auth/reset-password — public endpoint */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const { token, password } = parsed.data;

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record) return jsonError("Invalid or expired reset link", 400);
    if (record.usedAt) return jsonError("This reset link has already been used", 400);
    if (record.expiresAt < new Date()) return jsonError("This reset link has expired", 400);

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, passwordChangedAt: new Date(), mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
