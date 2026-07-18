import { requireSession, getOrgId, getOrgIdForSession, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { getAgent } from "@/modules/agents/agents.server";
import { publishEnforcementModeChange } from "@/modules/policies/policies.server";
import { z } from "zod";

const schema = z.object({ mode: z.enum(["monitor", "block"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    if (parsed.data.mode === "block") {
      await requireOrgRole(user.id, orgId, ["owner"]);
    }

    const agent = await getAgent(id, orgId);
    if (!agent) return jsonError("Not found", 404);

    let policy;
    try {
      policy = await publishEnforcementModeChange(
        agent.projectId,
        orgId,
        agent.channel,
        parsed.data.mode
      );
    } catch (err) {
      return jsonError(
        err instanceof Error ? err.message : "Failed to sign policy",
        500
      );
    }
    if (!policy) return jsonError("Project not found", 404);

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "agent.mode.change",
      target: id,
      metadata: {
        projectId: agent.projectId,
        channel: agent.channel,
        mode: parsed.data.mode,
        policyVersion: policy.version,
      },
    });

    return Response.json({ mode: policy.mode, policyVersion: policy.version });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
