import { prisma } from "@/lib/prisma";
import { jsonError, createAuditLog } from "@/lib/auth-helpers";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { z } from "zod";

const JWT_EXPIRY_SECONDS = 30 * 60; // 30 minutes

const exchangeSchema = z.object({
  token: z.string().min(64, "Invalid token format"),
});

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

/**
 * POST /api/auth/break-glass  — PUBLIC endpoint (no session required).
 *
 * Exchanges a single-use, pre-generated raw break-glass token for a
 * short-lived (30 min) emergency JWT.  The JWT can then be passed as
 * `Authorization: Bearer <jwt>` to admin endpoints even when the normal
 * authentication system is unavailable.
 *
 * Design rules (Addendum E.4.4):
 *  - Token must exist, be non-expired, non-revoked, and unused.
 *  - On success the token is immediately marked `usedAt = now()`.
 *  - One-time use: a second exchange of the same raw token will be rejected.
 *  - Every exchange is audit-logged as `break_glass.used`.
 *  - The raw token is never stored; only its SHA-256 hash is compared.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const limited = checkRateLimit(`break-glass:${ip}`, 5, 15 * 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const body = await req.json().catch(() => ({}));
    const parsed = exchangeSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request body", 400);

    const tokenHash = createHash("sha256")
      .update(parsed.data.token)
      .digest("hex");

    const record = await prisma.breakGlassToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { createdBy: { select: { id: true, email: true } } },
    });

    if (!record) {
      return jsonError("Invalid, expired, or already-used token", 401);
    }

    // Consume the token — mark used immediately (one-time use)
    const usedByIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    await prisma.breakGlassToken.update({
      where: { id: record.id },
      data: { usedAt: new Date(), usedByIp },
    });

    // Audit log (actor = the admin who originally created the token)
    await createAuditLog({
      actorId: record.createdBy.id,
      action: "break_glass.used",
      target: record.id,
      metadata: {
        usedByIp,
        reason: record.reason,
        createdBy: record.createdBy.email,
      },
    }).catch(() => {
      // Audit log failure must not block emergency access
    });

    // Issue a short-lived emergency JWT
    const jwt = await new SignJWT({
      sub: record.createdBy.id,
      email: record.createdBy.email,
      role: "admin",
      breakGlass: true,
      breakGlassTokenId: record.id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
      .sign(getJwtSecret());

    return Response.json(
      {
        jwt,
        expiresIn: JWT_EXPIRY_SECONDS,
        message: "Emergency JWT issued. Valid for 30 minutes. Single use only.",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[break-glass] exchange error", e);
    return jsonError("Internal server error", 500);
  }
}
