import { requireAdmin, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { requireMfa } from "@/modules/admin/mfa.server";
import { getPlatformSetting, setGlobalKillSwitch } from "@/modules/admin/incident.server";
import { requireApproval, markExecuted } from "@/modules/admin/approvals.server";
import { notifyAllOrgs } from "@/modules/notifications/user-notifications.server";
import { z } from "zod";

const schema = z.object({
  enabled: z.boolean(),
  reason: z.string().max(2000).optional(),
  approvalId: z.string().optional(),
});

/** GET /api/backoffice/kill-switch - current platform kill-switch state. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const setting = await getPlatformSetting();
    return Response.json({ setting });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/backoffice/kill-switch - toggle the platform-wide kill-switch
 * (Addendum E.6). Enabling requires a prior dual-authorization approval.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    // MFA is mandatory for the kill-switch regardless of whether MFA is
    // enrolled — an admin without MFA cannot operate this action (E.4.3).
    const mfaToken = req.headers.get("x-mfa-token") ?? undefined;
    await requireMfa(user.id, mfaToken);

    const orgId = await getOrgId(user.id).catch(() => undefined);
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    if (parsed.data.enabled) {
      try {
        const approval = await requireApproval({
          action: "platform.kill_switch",
          executorId: user.id,
        });
        await markExecuted(approval.id);
      } catch (err) {
        return jsonError(err instanceof Error ? err.message : "Approval required", 403);
      }
    }

    const setting = await setGlobalKillSwitch(parsed.data.enabled, parsed.data.reason);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: parsed.data.enabled ? "platform.kill_switch.enabled" : "platform.kill_switch.disabled",
      metadata: { reason: parsed.data.reason },
    });
    notifyAllOrgs({
      type:  parsed.data.enabled ? "kill_switch.enabled" : "kill_switch.disabled",
      title: parsed.data.enabled
        ? "Platform kill-switch activated"
        : "Platform kill-switch deactivated",
      body: parsed.data.enabled
        ? "All RASP agents have been set to passive mode by the platform operator."
        : "RASP agents have been restored to active inspection mode.",
      metadata: { reason: parsed.data.reason },
    }).catch(() => {});
    return Response.json({ setting });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
