import { requireAdmin, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { requireMfa } from "@/modules/admin/mfa.server";
import { requireApproval } from "@/modules/admin/approvals.server";
import { rollbackVersion } from "@/modules/rollout/rollout.server";
import { notifyAffectedProjects } from "@/modules/notifications/user-notifications.server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ reason: z.string().min(1) });

/**
 * Roll back an agent version (Addendum D.4): halt + deprecate it and advertise
 * the previous version to every affected agent. Records MTTR.
 *
 * Requires:
 *  - Admin session
 *  - Valid TOTP code in the `x-mfa-token` header (Addendum E.4.3)
 *  - A prior dual-authorization approval (Addendum E.4.3)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(req);
    const mfaToken = req.headers.get("x-mfa-token") ?? undefined;
    await requireMfa(user.id, mfaToken, { required: true });

    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    try {
      await requireApproval({
        action: "agent_version.rollback",
        target: id,
        executorId: user.id,
      });
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Approval required", 403);
    }

    const result = await rollbackVersion(id, parsed.data.reason);
    if (!result) return jsonError("Version not found", 404);

    await createAuditLog({
      actorId: user.id,
      action: "agent_version.rollback",
      target: id,
      metadata: { reason: parsed.data.reason, ...result },
    });

    prisma.agent.findMany({
      where: { upgradeStatus: "rolledback" },
      select: { projectId: true },
      orderBy: { lastUpgradeAt: "desc" },
      take: 200,
    }).then((agents) => {
      const projectIds = [...new Set(agents.map((a) => a.projectId))];
      return notifyAffectedProjects({
        projectIds,
        type:     "agent_version.rolledback",
        title:    `Agent version rolled back`,
        body:     `An agent version has been rolled back by the platform operator. Affected agents are now targeting their previous version.`,
        metadata: { versionId: id, reason: parsed.data.reason, ...result },
      });
    }).catch(() => {});

    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
