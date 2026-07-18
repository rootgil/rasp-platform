import { requireAdmin, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { requireMfa } from "@/modules/admin/mfa.server";
import { requireApproval } from "@/modules/admin/approvals.server";
import { rotateProjectKey } from "@/lib/envelope";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * GET /api/backoffice/dek?projectId=…
 * List all TenantKey rows for a project (DEK inventory).
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const projectId = new URL(req.url).searchParams.get("projectId");
    if (!projectId) return jsonError("projectId required", 400);

    const keys = await prisma.tenantKey.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        active: true,
        destroyed: true,
        createdAt: true,
        rotatedAt: true,
        // never expose wrappedDek
      },
    });

    return Response.json({ keys });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

const actionSchema = z.object({
  action: z.enum(["rotate", "shred"]),
  projectId: z.string().min(1),
});

/**
 * POST /api/backoffice/dek
 *  - action "rotate": deactivates current DEK and creates a new version.
 *  - action "shred": irreversible crypto-shred — requires MFA + dual-auth approval.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    const orgId = await getOrgIdForSession(user).catch(() => undefined);
    const body = await req.json().catch(() => ({}));
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const { action, projectId } = parsed.data;

    if (action === "rotate") {
      const mfaToken = req.headers.get("x-mfa-token") ?? undefined;
      await requireMfa(user.id, mfaToken, { required: true });

      const nextVersion = await rotateProjectKey(projectId);
      if (nextVersion == null) {
        return jsonError("KEK_MASTER_KEY not configured — cannot rotate DEK", 500);
      }

      await createAuditLog({
        actorId: user.id,
        organizationId: orgId,
        action: "dek.rotated",
        target: projectId,
        metadata: { nextVersion },
      });

      return Response.json({ rotated: true, version: nextVersion });
    }

    // shred: MFA + dual-authorization required (tenant.crypto_shred)
    const mfaToken = req.headers.get("x-mfa-token") ?? undefined;
    await requireMfa(user.id, mfaToken, { required: true });

    try {
      await requireApproval({
        action: "tenant.crypto_shred",
        target: projectId,
        executorId: user.id,
      });
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Approval required", 403);
    }

    await prisma.tenantKey.updateMany({
      where: { projectId },
      data: { active: false, destroyed: true, wrappedDek: null },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "dek.shredded",
      target: projectId,
      metadata: { warning: "All DEKs for project destroyed — data unrecoverable" },
    });

    return Response.json({ shredded: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
