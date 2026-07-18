"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    SwaggerUIBundle?: {
      (opts: Record<string, unknown>): void;
      presets: { apis: unknown };
      SwaggerUIStandalonePreset: unknown;
    };
  }
}

/**
 * Loads Swagger UI from CDN and mounts it into #swagger-ui.
 * Client island — must not render nested <html>/<body>.
 */
export function SwaggerUi() {
  const mounted = useRef(false);

  function init() {
    if (mounted.current || !window.SwaggerUIBundle) return;
    const el = document.getElementById("swagger-ui");
    if (!el) return;
    mounted.current = true;
    window.SwaggerUIBundle({
      url: "/api/openapi",
      dom_id: "#swagger-ui",
      presets: [
        window.SwaggerUIBundle.presets.apis,
        window.SwaggerUIBundle.SwaggerUIStandalonePreset,
      ],
      layout: "BaseLayout",
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
      tryItOutEnabled: true,
      withCredentials: false,
    });
  }

  useEffect(() => {
    if (window.SwaggerUIBundle) init();
  }, []);

  return (
    <>
      <div id="swagger-ui" />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={init}
      />
    </>
  );
}
