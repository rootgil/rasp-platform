import { requireAdmin, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  version: z.string(),
  channel: z.enum(["stable", "early", "edge"]),
  changelog: z.string().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const versions = await prisma.agentVersion.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(versions);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    const version = await prisma.agentVersion.create({ data: parsed.data });
    await createAuditLog({
      actorId: user.id,
      action: "agent_version.create",
      target: version.id,
      metadata: { version: version.version, channel: version.channel },
    });
    return Response.json(version, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
