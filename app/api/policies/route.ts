import { requireSession, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { listPolicies, createPolicy } from "@/modules/policies/policies.server";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().min(1),
  channel: z.enum(["stable", "early", "edge"]).optional(),
  mode: z.enum(["monitor", "block"]).optional(),
  detectionRules: z.unknown().optional(),
  redactionConfig: z.unknown().optional(),
  dataResidency: z.unknown().optional(),
  targetAgentVersion: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;
    const policies = await listPolicies(orgId, projectId);
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

    let policy;
    try {
      policy = await createPolicy(parsed.data.projectId, orgId, parsed.data);
    } catch (err) {
      // Most likely the signing key is not configured.
      return jsonError(
        err instanceof Error ? err.message : "Failed to sign policy",
        500
      );
    }
    if (!policy) return jsonError("Project not found", 404);

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "policy.publish",
      target: policy.id,
      metadata: { projectId: policy.projectId, version: policy.version, channel: policy.channel },
    });

    return Response.json(policy, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
