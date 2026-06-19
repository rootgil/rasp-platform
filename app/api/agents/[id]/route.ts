import { requireSession, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { getAgent } from "@/modules/agents/agents.server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const agent = await getAgent(id, orgId);
    if (!agent) return jsonError("Not found", 404);
    return Response.json(agent);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user   = await requireSession();
    const orgId  = await getOrgId(user.id);

    const agent = await prisma.agent.findFirst({
      where:  { id, project: { organizationId: orgId } },
      select: { id: true },
    });
    if (!agent) return jsonError("Agent not found", 404);

    await prisma.agent.delete({ where: { id } });

    await createAuditLog({
      actorId:        user.id,
      organizationId: orgId,
      action:         "agent.delete",
      target:         id,
      metadata:       {},
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
