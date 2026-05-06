"use client";

import Script from "next/script";

export function SwaggerUiClient() {
  return (
    <div className="rounded-2xl border bg-card p-2 shadow-sm">
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <div id="swagger-ui" />
      <Script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" strategy="afterInteractive" />
      <Script
        id="swagger-ui-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function() {
              if (!window.SwaggerUIBundle) return;
              window.SwaggerUIBundle({
                url: '/api/openapi',
                dom_id: '#swagger-ui',
                deepLinking: true,
                displayRequestDuration: true,
                docExpansion: 'list',
                presets: [window.SwaggerUIBundle.presets.apis],
              });
            });
          `,
        }}
      />
    </div>
  );
}
