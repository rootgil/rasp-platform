import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { purgeProjectData, purgeByRetention } from "@/modules/compliance/retention.server";
import { destroyProjectKeys } from "@/lib/envelope";
import { z } from "zod";

const schema = z.object({
  // "delete-all" = right-to-deletion; "retention" = purge older than N days.
  mode: z.enum(["delete-all", "retention"]).default("delete-all"),
  retentionDays: z.number().int().positive().max(3650).optional(),
  // When true on delete-all, also crypto-shred the tenant's encryption keys.
  cryptoShred: z.boolean().optional(),
});

/**
 * POST /api/projects/:id/purge
 *
 * Right-to-deletion (mode=delete-all) or retention purge (mode=retention) of
 * a project's telemetry. Audited.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    await requireOrgRole(user.id, orgId, ["owner"]);
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    let counts;
    let keysDestroyed = 0;
    if (parsed.data.mode === "retention") {
      counts = await purgeByRetention(id, orgId, parsed.data.retentionDays ?? 90);
    } else {
      counts = await purgeProjectData(id, orgId);
      // Crypto-shred is irreversible — owners only (already gated) and explicit flag.
      if (counts && parsed.data.cryptoShred) {
        keysDestroyed = await destroyProjectKeys(id);
      }
    }
    if (!counts) return jsonError("Project not found", 404);

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: parsed.data.mode === "retention" ? "project.retention_purge" : "project.right_to_deletion",
      target: id,
      metadata: { ...counts, retentionDays: parsed.data.retentionDays, keysDestroyed },
    });

    return Response.json({ purged: counts, keysDestroyed });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
