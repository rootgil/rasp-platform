export const metadata = {
  title: "API Docs - RASP Platform",
  description: "Interactive OpenAPI documentation for the RASP Platform API",
};

export default function DocsPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RASP Platform - API Docs</title>
        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
        />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: sans-serif; }
          #swagger-ui .topbar { display: none; }
        `}</style>
      </head>
      <body>
        <div id="swagger-ui" />
        <script
          src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
          // next/script is not usable in a root html layout; inline script is fine here
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener("load", function () {
                SwaggerUIBundle({
                  url: "/api/openapi",
                  dom_id: "#swagger-ui",
                  presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset,
                  ],
                  layout: "BaseLayout",
                  docExpansion: "list",
                  deepLinking: true,
                  persistAuthorization: true,
                  tryItOutEnabled: true,
                  withCredentials: true,
                });
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
