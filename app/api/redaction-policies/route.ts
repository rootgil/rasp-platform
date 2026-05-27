import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { getRedactionPolicies, createRedactionPolicy } from "@/modules/redaction/redaction.server";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string(),
  mode: z.enum(["denylist", "allowlist", "metadata-only", "local-only"]),
  rules: z.unknown().optional(),
});

export async function GET() {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const policies = await getRedactionPolicies(orgId);
    return Response.json(policies);
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
    const policy = await createRedactionPolicy(parsed.data.projectId, orgId, {
      mode: parsed.data.mode,
      rules: parsed.data.rules,
    });
    if (!policy) return jsonError("Project not found", 404);
    return Response.json(policy, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
