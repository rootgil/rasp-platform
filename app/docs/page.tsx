import type { Metadata } from "next";
import { SwaggerUi } from "@/components/docs/swagger-ui";

export const metadata: Metadata = {
  title: "API Docs - RASP Platform",
  description: "Interactive OpenAPI documentation for the RASP Platform API",
};

/**
 * Swagger UI — open in development; admin-only in production (proxy.ts + /api/openapi).
 * Version pinned; withCredentials disabled to avoid session cookie exfiltration via CDN.
 */
export default function DocsPage() {
  return <SwaggerUi />;
}
