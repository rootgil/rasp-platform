import { requireAdmin, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { getPlatformSetting, setGlobalKillSwitch } from "@/modules/admin/incident.server";
import { requireApproval, markExecuted } from "@/modules/admin/approvals.server";
import { z } from "zod";

const schema = z.object({
  enabled: z.boolean(),
  reason: z.string().max(2000).optional(),
  approvalId: z.string().optional(),
});

/** GET /api/backoffice/kill-switch — current platform kill-switch state. */
export async function GET() {
  try {
    await requireAdmin();
    const setting = await getPlatformSetting();
    return Response.json({ setting });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/backoffice/kill-switch — toggle the platform-wide kill-switch
 * (Addendum E.6). Enabling requires a prior dual-authorization approval.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
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
    return Response.json({ setting });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
