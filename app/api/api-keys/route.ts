import { requireSession, getOrgId, getOrgIdForSession, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/rbac";
import { getApiKeys, createApiKey } from "@/modules/api-keys/api-keys.server";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string(),
  name: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const keys = await getApiKeys(orgId);
    return Response.json(keys.map((k) => ({ ...k, keyHash: undefined })));
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    await requireOrgRole(user.id, orgId, ["owner"]);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);
    const result = await createApiKey(parsed.data.projectId, orgId, parsed.data.name);
    if (!result) return jsonError("Project not found", 404);
    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "api_key.create",
      target: result.id,
      metadata: { prefix: result.prefix },
    });
    // rawKey is only returned once
    return Response.json({ ...result, keyHash: undefined }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
