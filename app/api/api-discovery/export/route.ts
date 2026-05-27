import { requireSession, getOrgId, jsonError } from "@/lib/auth-helpers";
import { getDiscoveredEndpoints } from "@/modules/api-discovery/api-discovery.server";

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const body = await req.json().catch(() => ({}));
    const endpoints = await getDiscoveredEndpoints(orgId, body.projectId);

    const paths: Record<string, unknown> = {};
    for (const ep of endpoints) {
      const method = ep.method.toLowerCase();
      if (!paths[ep.pathPattern]) paths[ep.pathPattern] = {};
      (paths[ep.pathPattern] as Record<string, unknown>)[method] = {
        summary: `${ep.method} ${ep.pathPattern}`,
        description: `Auth: ${ep.authStatus}. Sensitive data: ${ep.hasSensitiveData}`,
        "x-rasp-risk-score": ep.riskScore,
        "x-rasp-shadow-api": ep.isShadowApi,
        "x-rasp-zombie-api": ep.isZombieApi,
      };
    }

    const spec = {
      openapi: "3.0.0",
      info: {
        title: "RASP Discovered API Inventory",
        version: "1.0.0",
        description: "Auto-generated from observed runtime traffic",
      },
      paths,
    };

    return new Response(JSON.stringify(spec, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
