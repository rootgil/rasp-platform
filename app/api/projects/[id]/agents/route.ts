import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/** GET /api/projects/:id/agents - list agents for a project. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return jsonError("Project not found", 404);

    const agents = await prisma.agent.findMany({
      where: { projectId: id },
      select: {
        id: true,
        version: true,
        status: true,
        maintenanceWindow: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ agents });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
