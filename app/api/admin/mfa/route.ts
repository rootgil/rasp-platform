import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { beginMfaEnrollment, confirmMfaEnrollment, disableMfa } from "@/modules/admin/mfa.server";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/** GET /api/admin/mfa - return the caller's current MFA status. */
export async function GET() {
  try {
    const user = await requireSession();
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaEnabled: true },
    });
    return Response.json({ mfaEnabled: record?.mfaEnabled ?? false });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

const schema = z.object({
  action: z.enum(["enroll", "confirm", "disable"]),
  token: z.string().regex(/^\d{6}$/).optional(),
});

/**
 * POST /api/admin/mfa - manage the caller's TOTP MFA (Addendum E.4.3).
 *  - enroll: generate a secret + otpauth URL for QR display
 *  - confirm: verify the first code and enable MFA
 *  - disable: remove the secret and disable MFA
 */
export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user).catch(() => undefined);
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    if (parsed.data.action === "confirm") {
      const ip = clientIp(req);
      const limited = checkRateLimit(`mfa-confirm:${user.id}:${ip}`, 10, 15 * 60_000);
      if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);
    }

    if (parsed.data.action === "enroll") {
      const result = await beginMfaEnrollment(user.id, user.email);
      return Response.json(result);
    }

    if (parsed.data.action === "confirm") {
      if (!parsed.data.token) return jsonError("token is required", 400);
      const ok = await confirmMfaEnrollment(user.id, parsed.data.token);
      if (!ok) return jsonError("Invalid MFA code", 400);
      await createAuditLog({
        actorId: user.id,
        organizationId: orgId,
        action: "mfa.enabled",
        target: user.id,
      });
      return Response.json({ enabled: true });
    }

    if (parsed.data.action === "disable") {
      if (!parsed.data.token) return jsonError("Current MFA token is required to disable", 400);
      const record = await prisma.user.findUnique({
        where: { id: user.id },
        select: { totpSecret: true, mfaEnabled: true },
      });
      if (!record?.mfaEnabled || !record.totpSecret) {
        return jsonError("MFA is not enabled", 400);
      }
      const { verifyTotp } = await import("@/lib/totp");
      if (!verifyTotp(record.totpSecret, parsed.data.token)) {
        return jsonError("Invalid MFA code", 400);
      }
      await disableMfa(user.id);
      await createAuditLog({
        actorId: user.id,
        organizationId: orgId,
        action: "mfa.disabled",
        target: user.id,
      });
      return Response.json({ enabled: false });
    }

    return jsonError("Unknown action", 400);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
