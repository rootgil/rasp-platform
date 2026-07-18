import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { setAgentVersionControls } from "@/modules/agents/agents.server";
import { z } from "zod";

const maintenanceWindowSchema = z
  .object({
    startHour: z.number().int().min(0).max(23).optional(),
    endHour: z.number().int().min(0).max(24).optional(),
    days: z.array(z.number().int().min(0).max(6)).optional(),
  })
  .nullable();

const schema = z.object({
  pinnedVersion: z.string().nullable().optional(),
  maintenanceWindow: maintenanceWindowSchema.optional(),
});

/**
 * Customer-facing version control for an agent: pin/unpin a version and set the
 * maintenance window (Addendum D.2).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const agent = await setAgentVersionControls(id, orgId, parsed.data);
    if (!agent) return jsonError("Not found", 404);

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "agent.version_controls",
      target: id,
      metadata: {
        pinnedVersion: parsed.data.pinnedVersion,
        maintenanceWindow: parsed.data.maintenanceWindow,
      },
    });

    return Response.json({
      id: agent.id,
      pinnedVersion: agent.pinnedVersion,
      maintenanceWindow: agent.maintenanceWindow,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
