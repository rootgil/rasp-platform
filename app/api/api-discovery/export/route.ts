import { requireSession, getOrgId, getOrgIdForSession, jsonError } from "@/lib/auth-helpers";
import { getDiscoveredEndpoints } from "@/modules/api-discovery/api-discovery.server";

/** Map inferred JSON type names to OpenAPI schema types. */
function openApiType(t: string): string {
  switch (t) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return "string";
  }
}

/** Convert `/users/:id` (runtime form) to `/users/{id}` (OpenAPI form). */
function toOpenApiPath(pattern: string): { path: string; params: string[] } {
  const params: string[] = [];
  const path = pattern.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
    params.push(name);
    return `{${name}}`;
  });
  return { path, params };
}

const BODY_METHODS = new Set(["post", "put", "patch"]);

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const body = await req.json().catch(() => ({}));
    const endpoints = await getDiscoveredEndpoints(orgId, body.projectId);

    const paths: Record<string, Record<string, unknown>> = {};

    for (const ep of endpoints) {
      const method = ep.method.toLowerCase();
      const { path, params: pathParams } = toOpenApiPath(ep.pathPattern);
      if (!paths[path]) paths[path] = {};

      const schemaFields = (ep.schema as Record<string, string> | null) ?? {};
      const errorRate =
        ep.trafficCount > 0 ? +(ep.errorCount / ep.trafficCount).toFixed(3) : 0;

      // Path parameters.
      const parameters: Record<string, unknown>[] = pathParams.map((name) => ({
        name,
        in: "path",
        required: true,
        schema: { type: "string" },
      }));

      // Query params / request body from inferred schema.
      const properties: Record<string, unknown> = {};
      for (const [field, type] of Object.entries(schemaFields)) {
        if (BODY_METHODS.has(method)) {
          properties[field] = { type: openApiType(type) };
        } else {
          parameters.push({ name: field, in: "query", schema: { type: openApiType(type) } });
        }
      }

      const operation: Record<string, unknown> = {
        summary: `${ep.method} ${ep.pathPattern}`,
        description: `Auth: ${ep.authStatus}. Authorization: ${ep.authorization}. Sensitive data: ${ep.hasSensitiveData}`,
        parameters,
        responses: {
          "2xx": { description: "Observed successful response" },
          ...(ep.errorCount > 0 ? { "4xx": { description: "Observed error response" } } : {}),
        },
        ...(ep.authStatus === "authenticated" ? { security: [{ bearerAuth: [] }] } : {}),
        "x-rasp-risk-score": ep.riskScore,
        "x-rasp-shadow-api": ep.isShadowApi,
        "x-rasp-zombie-api": ep.isZombieApi,
        "x-rasp-traffic-count": ep.trafficCount,
        "x-rasp-error-rate": errorRate,
        "x-rasp-avg-response-ms": ep.avgResponseMs,
        "x-rasp-last-seen": ep.lastSeenAt,
      };

      if (BODY_METHODS.has(method) && Object.keys(properties).length > 0) {
        operation.requestBody = {
          content: { "application/json": { schema: { type: "object", properties } } },
        };
      }

      paths[path][method] = operation;
    }

    const spec = {
      openapi: "3.0.0",
      info: {
        title: "RASP Discovered API Inventory",
        version: "1.0.0",
        description: "Auto-generated from observed runtime traffic",
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      },
      paths,
    };

    return new Response(JSON.stringify(spec, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="rasp-openapi.json"',
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
