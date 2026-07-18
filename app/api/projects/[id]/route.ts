import { requireSession, getOrgId, getOrgIdForSession, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { getProject, deleteProject } from "@/modules/projects/projects.server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  framework: z.string().optional(),
  environment: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);

    const project = await getProject(id, orgId);
    if (!project) return jsonError("Not found", 404);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    if (Object.keys(parsed.data).length === 0) return jsonError("No fields to update", 400);

    const updated = await prisma.project.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, framework: true, environment: true },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "project.update",
      target: id,
      metadata: parsed.data,
    });

    return Response.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
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
    const orgId = await getOrgIdForSession(user);
    await requireOrgRole(user.id, orgId, ["owner"]);
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
