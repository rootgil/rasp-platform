import { requireAdmin, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { requireMfa } from "@/modules/admin/mfa.server";
import { setVersionQuarantine } from "@/modules/admin/incident.server";
import { requireApproval } from "@/modules/admin/approvals.server";
import { notifyAffectedProjects } from "@/modules/notifications/user-notifications.server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  quarantined: z.boolean(),
  reason: z.string().max(2000).optional(),
});

/**
 * POST /api/backoffice/agent-versions/:id/quarantine - quarantine or release a
 * version (Addendum E.6). Quarantining requires a prior dual-authorization.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(req);
    const mfaToken = req.headers.get("x-mfa-token") ?? undefined;
    await requireMfa(user.id, mfaToken, { required: true });

    const orgId = await getOrgIdForSession(user).catch(() => undefined);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    if (parsed.data.quarantined) {
      try {
        await requireApproval({
          action: "agent_version.quarantine",
          target: id,
          executorId: user.id,
        });
      } catch (err) {
        return jsonError(err instanceof Error ? err.message : "Approval required", 403);
      }
    }

    const version = await setVersionQuarantine(id, parsed.data.quarantined, parsed.data.reason);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: parsed.data.quarantined ? "agent_version.quarantined" : "agent_version.released",
      target: id,
      metadata: { reason: parsed.data.reason },
    });

    if (parsed.data.quarantined) {
      prisma.agent.findMany({
        where: { targetVersion: version.version },
        select: { projectId: true },
      }).then((agents) => {
        const projectIds = [...new Set(agents.map((a) => a.projectId))];
        return notifyAffectedProjects({
          projectIds,
          type:     "agent_version.quarantined",
          title:    `Agent version ${version.version} quarantined`,
          body:     `Version ${version.version} has been quarantined by the platform operator and is no longer served to agents.`,
          metadata: { versionId: id, version: version.version, reason: parsed.data.reason },
        });
      }).catch(() => {});
    }

    return Response.json({ version });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
