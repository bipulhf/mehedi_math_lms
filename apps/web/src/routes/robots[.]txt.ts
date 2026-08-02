import { createFileRoute } from "@tanstack/react-router";

import { fetchFromApiRoot } from "@/lib/seo-origin";

/**
 * Same reasoning as sitemap.xml: the crawler asks the public origin, so the
 * public origin has to answer. The API owns the content.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async (): Promise<Response> => {
        const response = await fetchFromApiRoot("/robots.txt");

        if (!response.ok) {
          // Never 502 a robots request into a crawler's face: an unreachable
          // robots.txt is treated by some crawlers as "disallow everything".
          return new Response("User-agent: *\nAllow: /\n", {
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        }

        return new Response(await response.text(), {
          headers: {
            "Cache-Control": "public, max-age=86400",
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      }
    }
  }
});
