import { createFileRoute } from "@tanstack/react-router";

import { fetchFromApiRoot } from "@/lib/seo-origin";

/**
 * Served from the public origin so a crawler finds it without a reverse-proxy
 * rule. The body is generated (and Redis-cached) by the API.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async (): Promise<Response> => {
        const response = await fetchFromApiRoot("/sitemap.xml");

        if (!response.ok) {
          return new Response("Sitemap unavailable", { status: 502 });
        }

        return new Response(await response.text(), {
          headers: {
            "Cache-Control": "public, max-age=300",
            "Content-Type": "application/xml; charset=utf-8"
          }
        });
      }
    }
  }
});
