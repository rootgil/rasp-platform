import { requireSession, getOrgId, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { getProjects, createProject } from "@/modules/projects/projects.server";
import { backfillNotificationsForProject } from "@/modules/project-rules/notifications.server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  language: z.string().min(1),
  framework: z.string().optional(),
  environment: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const projects = await getProjects(orgId);
    return Response.json(projects);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    const project = await createProject(orgId, parsed.data);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "project.create",
      target: project.id,
      metadata: { name: project.name },
    });
    backfillNotificationsForProject(project.id).catch(() => {});
    return Response.json(project, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
