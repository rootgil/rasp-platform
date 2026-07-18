import { requireSession, getOrgId, getOrgIdForSession, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const windowSchema = z.object({
  // UTC hour [0-23] the window opens (inclusive)
  startHour: z.number().int().min(0).max(23),
  // UTC hour [0-23] the window closes (exclusive)
  endHour: z.number().int().min(1).max(24),
  // ISO day-of-week numbers [0=Sun … 6=Sat]. Omit for every day.
  days: z.array(z.number().int().min(0).max(6)).optional(),
});

const schema = z.union([
  z.object({ action: z.literal("set"), window: windowSchema }),
  z.object({ action: z.literal("clear") }),
]);

/** GET /api/agents/:id/maintenance - return current maintenance window. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const { id } = await params;

    const agent = await prisma.agent.findFirst({
      where: { id, project: { organizationId: orgId } },
      select: { id: true, maintenanceWindow: true },
    });
    if (!agent) return jsonError("Agent not found", 404);

    return Response.json({ maintenanceWindow: agent.maintenanceWindow });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/agents/:id/maintenance
 *  - action "set": configure the upgrade maintenance window for this agent.
 *  - action "clear": remove the window (upgrades can be advertised at any time).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const { id } = await params;

    const agent = await prisma.agent.findFirst({
      where: { id, project: { organizationId: orgId } },
      select: { id: true, project: { select: { id: true } } },
    });
    if (!agent) return jsonError("Agent not found", 404);

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const maintenanceWindow = parsed.data.action === "set" ? parsed.data.window : null;

    await prisma.agent.update({
      where: { id },
      data: { maintenanceWindow: maintenanceWindow ?? undefined },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: parsed.data.action === "set" ? "agent.maintenance_window_set" : "agent.maintenance_window_cleared",
      target: id,
      metadata: maintenanceWindow ? { window: maintenanceWindow } : undefined,
    });

    return Response.json({ maintenanceWindow });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
