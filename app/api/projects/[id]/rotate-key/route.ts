import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { rotateProjectKey } from "@/lib/envelope";

/**
 * POST /api/projects/:id/rotate-key
 *
 * Rotate the tenant's data-encryption key (Addendum E.6). Existing ciphertext
 * stays readable under its previous version; new payloads use the new key.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return jsonError("Project not found", 404);

    const version = await rotateProjectKey(id);
    if (version === null) {
      return jsonError("Encryption is not configured (KEK_MASTER_KEY missing)", 400);
    }

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "tenant_key.rotate",
      target: id,
      metadata: { newVersion: version },
    });

    return Response.json({ rotated: true, version });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
