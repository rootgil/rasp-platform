import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { buildOpenApiSpec } from "@/lib/openapi";

export const dynamic = "force-dynamic";

function docsEnabled(): boolean {
  if (process.env.DOCS_ENABLED !== undefined) {
    return process.env.DOCS_ENABLED === "true";
  }
  return process.env.NODE_ENV !== "production";
}

export async function GET() {
  try {
    if (!docsEnabled()) {
      return jsonError("Not found", 404);
    }
    await requireAdmin();
    const spec = buildOpenApiSpec();
    return new Response(JSON.stringify(spec, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
