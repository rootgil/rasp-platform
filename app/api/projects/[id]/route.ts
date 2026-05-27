import { requireSession, getOrgId, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { getProject, deleteProject } from "@/modules/projects/projects.server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const project = await getProject(id, orgId);
    if (!project) return jsonError("Not found", 404);
    return Response.json(project);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    await deleteProject(id, orgId);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "project.delete",
      target: id,
    });
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
