import { requireAdmin, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

const EXPIRY_HOURS = 4;

const createSchema = z.object({
  reason: z.string().min(10).max(2000),
});

const revokeSchema = z.object({
  tokenId: z.string().min(1),
});

/**
 * GET /api/admin/break-glass - list active (non-expired, non-revoked, non-used)
 * break-glass tokens for audit purposes.
 */
export async function GET() {
  try {
    await requireAdmin();
    const tokens = await prisma.breakGlassToken.findMany({
      where: {
        revoked: false,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        reason: true,
        expiresAt: true,
        createdAt: true,
        createdBy: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ tokens });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/admin/break-glass
 *  - action "create": generate a single-use, 4-hour emergency token. The raw
 *    token is returned ONCE and never stored — only its SHA-256 hash is kept.
 *  - action "revoke": immediately invalidate an active token.
 *
 * Every invocation is audit-logged (Addendum E.4.4).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const orgId = await getOrgId(user.id).catch(() => undefined);
    const body = await req.json().catch(() => ({}));

    const actionField = (body as { action?: string }).action;

    if (actionField === "revoke") {
      const parsed = revokeSchema.safeParse(body);
      if (!parsed.success) return jsonError("Invalid request", 400);

      const token = await prisma.breakGlassToken.findUnique({
        where: { id: parsed.data.tokenId },
      });
      if (!token) return jsonError("Token not found", 404);

      await prisma.breakGlassToken.update({
        where: { id: token.id },
        data: { revoked: true },
      });

      await createAuditLog({
        actorId: user.id,
        organizationId: orgId,
        action: "break_glass.revoked",
        target: token.id,
      });

      return Response.json({ revoked: true });
    }

    // create
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

    const record = await prisma.breakGlassToken.create({
      data: {
        tokenHash,
        createdById: user.id,
        reason: parsed.data.reason,
        expiresAt,
      },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "break_glass.created",
      target: record.id,
      metadata: { reason: parsed.data.reason, expiresAt: expiresAt.toISOString() },
    });

    // rawToken is returned ONCE. It is never stored.
    return Response.json({
      id: record.id,
      rawToken,
      expiresAt: expiresAt.toISOString(),
      warning: "Store this token securely. It will not be shown again.",
    }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
