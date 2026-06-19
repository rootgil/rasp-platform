import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { publishProjectRules, PublishError } from "@/modules/project-rules/publish";
import { RuleCompileError } from "@/modules/project-rules/yaml-compiler";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const user   = await requireSession();
    const orgId  = await getOrgId(user.id);
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const policy = await publishProjectRules(parsed.data.projectId, orgId, user.id);
    return Response.json(policy, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    if (e instanceof PublishError) return jsonError(e.message, 400);
    if (e instanceof RuleCompileError) return jsonError(e.message, 400);
    console.error("[POST /api/project-rules/publish]", e);
    return jsonError("Internal server error", 500);
  }
}
