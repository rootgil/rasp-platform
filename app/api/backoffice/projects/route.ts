import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/** GET /api/backoffice/projects - list all projects across all organizations. */
export async function GET() {
  try {
    await requireAdmin();
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        language: true,
        environment: true,
        organization: { select: { id: true, name: true } },
        _count: { select: { agents: true } },
      },
      orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
    });
    return Response.json({ projects });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
