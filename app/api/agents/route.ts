import { z } from "zod";
import { requireSession, getOrgId, getOrgIdForSession, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { getAgents, createAgent } from "@/modules/agents/agents.server";
import { createApiKey } from "@/modules/api-keys/api-keys.server";

const createSchema = z.object({
  projectId: z.string().min(1),
  language: z.string().min(1),
  framework: z.string().optional(),
  mode: z.enum(["monitor", "block"]).default("monitor"),
});

export async function GET() {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const agents = await getAgents(orgId);
    return Response.json(agents);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const agent = await createAgent(parsed.data.projectId, orgId, parsed.data);
    if (!agent) return jsonError("Project not found", 404);

    const apiKey = await createApiKey(
      parsed.data.projectId,
      orgId,
      `Agent ${agent.id.slice(0, 8)}`
    );

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "agent.create",
      target: agent.id,
      metadata: { projectId: parsed.data.projectId, language: parsed.data.language },
    });

    return Response.json(
      { agent, rawKey: apiKey?.rawKey ?? null },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
