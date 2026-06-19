import { requireSession, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import {
  listProjectRules,
  addFromCatalogue,
  createCustomRule,
} from "@/modules/project-rules/project-rules.server";
import { z } from "zod";

const addCatalogueSchema = z.object({
  projectId:       z.string().min(1),
  catalogueRuleId: z.string().min(1),
});

const createCustomSchema = z.object({
  projectId:      z.string().min(1),
  yamlDefinition: z.string().min(1),
});

const postSchema = z.discriminatedUnion("source", [
  addCatalogueSchema.extend({ source: z.literal("catalogue") }),
  createCustomSchema.extend({ source: z.literal("custom") }),
]);

export async function GET(req: Request) {
  try {
    const user  = await requireSession();
    const orgId = await getOrgId(user.id);
    const projectId = new URL(req.url).searchParams.get("projectId");
    if (!projectId) return jsonError("projectId is required", 400);

    const rules = await listProjectRules(projectId, orgId);
    if (rules === null) return jsonError("Project not found", 404);

    return Response.json(rules);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user  = await requireSession();
    const orgId = await getOrgId(user.id);
    const body  = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    let result;
    if (parsed.data.source === "catalogue") {
      result = await addFromCatalogue(parsed.data.projectId, orgId, parsed.data.catalogueRuleId);
    } else {
      result = await createCustomRule(parsed.data.projectId, orgId, parsed.data.yamlDefinition);
    }

    if (result === null) return jsonError("Project or catalogue rule not found", 404);
    if (result && "errors" in result) return jsonError(JSON.stringify(result.errors), 400);

    await createAuditLog({
      actorId:        user.id,
      organizationId: orgId,
      action:         "project_rule.create",
      target:         (result as { id: string }).id,
      metadata:       { source: parsed.data.source, projectId: parsed.data.projectId },
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
