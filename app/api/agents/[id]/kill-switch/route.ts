import { requireSession, getOrgId, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { setAgentKillSwitch } from "@/modules/agents/agents.server";
import { z } from "zod";

const schema = z.object({ killSwitch: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    await requireOrgRole(user.id, orgId, ["owner"]);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    const agent = await setAgentKillSwitch(id, orgId, parsed.data.killSwitch);
    if (!agent) return jsonError("Not found", 404);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: parsed.data.killSwitch ? "agent.kill_switch.enable" : "agent.kill_switch.disable",
      target: id,
    });
    return Response.json(agent);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
