import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth-helpers";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * POST /api/auth/mfa-required
 * Probe whether credentials are valid and MFA is required before issuing a session.
 * Never reveals whether the email exists when password is wrong.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const limited = checkRateLimit(`mfa-probe:${ip}`, 20, 15 * 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const emailLimited = checkRateLimit(
      `login:${parsed.data.email.toLowerCase()}`,
      10,
      15 * 60_000
    );
    if (!emailLimited.ok) return rateLimitResponse(emailLimited.retryAfterSec);

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { passwordHash: true, mfaEnabled: true },
    });
    if (!user) {
      return Response.json({ valid: false, mfaRequired: false });
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return Response.json({ valid: false, mfaRequired: false });
    }

    return Response.json({ valid: true, mfaRequired: !!user.mfaEnabled });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
