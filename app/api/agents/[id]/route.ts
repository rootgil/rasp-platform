import { requireSession, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { getAgent } from "@/modules/agents/agents.server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  channel: z.enum(["stable", "early", "edge"]).optional(),
  pinnedVersion: z.string().nullable().optional(),
});

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request body", 400);

    const agent = await prisma.agent.findFirst({
      where: { id, project: { organizationId: orgId } },
      select: { id: true, channel: true, pinnedVersion: true },
    });
    if (!agent) return jsonError("Agent not found", 404);

    const { channel, pinnedVersion } = parsed.data;

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        ...(channel !== undefined ? { channel } : {}),
        ...(pinnedVersion !== undefined ? { pinnedVersion } : {}),
      },
      select: { id: true, channel: true, pinnedVersion: true },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "agent.update_channel",
      target: id,
      metadata: {
        previousChannel: agent.channel,
        newChannel: channel ?? agent.channel,
        previousPinnedVersion: agent.pinnedVersion,
        newPinnedVersion: pinnedVersion !== undefined ? pinnedVersion : agent.pinnedVersion,
      },
    });

    return Response.json(updated);
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
