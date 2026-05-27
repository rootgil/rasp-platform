import { requireAdmin, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAdmin();
    const version = await prisma.agentVersion.findUnique({ where: { id } });
    if (!version) return jsonError("Not found", 404);
    const updated = await prisma.agentVersion.update({
      where: { id },
      data: { status: "published", releasedAt: new Date() },
    });
    await createAuditLog({
      actorId: user.id,
      action: "agent_version.promote",
      target: id,
      metadata: { version: version.version, channel: version.channel },
    });
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
