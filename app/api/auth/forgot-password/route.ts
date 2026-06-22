import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { jsonError } from "@/lib/auth-helpers";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

/** POST /api/auth/forgot-password — public endpoint, never reveals if email exists */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid email", 400);

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate any existing unused token for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      await sendPasswordResetEmail({ to: email, token: rawToken }).catch(() => {
        // Do not leak email delivery failure to caller
      });
    }

    // Always return 200 — do not reveal whether email exists
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
