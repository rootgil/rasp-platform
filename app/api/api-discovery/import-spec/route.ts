import { requireSession, getOrgId, getOrgIdForSession, jsonError, jsonOk, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

type OpenApiSpec = {
  paths?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
};

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);

    let spec: OpenApiSpec;
    try {
      spec = await req.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    if (!spec.paths || typeof spec.paths !== "object") {
      return jsonError("OpenAPI spec must contain a 'paths' object", 400);
    }

    // Build a set of "METHOD /path" strings from the spec
    const specEndpoints = new Set<string>();
    for (const [path, methods] of Object.entries(spec.paths)) {
      if (typeof methods === "object" && methods !== null) {
        for (const method of Object.keys(methods)) {
          // Skip non-HTTP-method keys (parameters, summary, etc.)
          const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
          if (HTTP_METHODS.includes(method.toLowerCase())) {
            specEndpoints.add(`${method.toUpperCase()} ${path}`);
          }
        }
      }
    }

    // Fetch all discovered endpoints for this org
    const discovered = await prisma.discoveredEndpoint.findMany({
      where: { project: { organizationId: orgId } },
      select: { id: true, method: true, pathPattern: true, isShadowApi: true },
    });

    // Partition into shadow (not in spec) and known (in spec)
    const toMarkShadow: string[] = [];
    const toMarkKnown: string[] = [];

    for (const ep of discovered) {
      const key = `${ep.method.toUpperCase()} ${ep.pathPattern}`;
      if (specEndpoints.has(key)) {
        if (ep.isShadowApi) toMarkKnown.push(ep.id);
      } else {
        if (!ep.isShadowApi) toMarkShadow.push(ep.id);
      }
    }

    // Apply updates in a transaction
    await prisma.$transaction([
      ...(toMarkShadow.length > 0
        ? [prisma.discoveredEndpoint.updateMany({
            where: { id: { in: toMarkShadow } },
            data: { isShadowApi: true },
          })]
        : []),
      ...(toMarkKnown.length > 0
        ? [prisma.discoveredEndpoint.updateMany({
            where: { id: { in: toMarkKnown } },
            data: { isShadowApi: false },
          })]
        : []),
    ]);

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "api_spec_imported",
      metadata: {
        specEndpointsCount: specEndpoints.size,
        newShadow: toMarkShadow.length,
        cleared: toMarkKnown.length,
      },
    });

    return jsonOk({
      total: discovered.length,
      specEndpoints: specEndpoints.size,
      newShadow: toMarkShadow.length,
      cleared: toMarkKnown.length,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
