import { buildOpenApiSpec } from "@/lib/openapi";

export const dynamic = "force-static";

export function GET() {
  const spec = buildOpenApiSpec();
  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
