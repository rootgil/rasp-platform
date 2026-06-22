import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const version = await prisma.agentVersion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!version) return jsonError("Not found", 404);

    const metrics = await prisma.rolloutMetric.findMany({
      where: { versionId: id },
      orderBy: { stage: "asc" },
      select: {
        stage: true,
        agentsTargeted: true,
        agentsFailed: true,
        errorEvents: true,
        haltedAt: true,
        mttrSeconds: true,
        createdAt: true,
      },
    });

    const result = metrics.map((m) => ({
      stage: m.stage,
      errorRate:
        m.agentsTargeted > 0
          ? Math.round((m.agentsFailed / m.agentsTargeted) * 10000) / 10000
          : null,
      p99LatencyMs: null as number | null,
      haltedAt: m.haltedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    }));

    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
