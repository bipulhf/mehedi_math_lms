import { Hono } from "hono";

import { env } from "@/lib/env";
import { sitemapService } from "@/lib/container";

export const siteSeoRoutes = new Hono();

siteSeoRoutes.get("/sitemap.xml", async (context) => {
  const xml = await sitemapService.getSitemapXml();

  return context.text(xml, 200, {
    "Cache-Control": "public, max-age=300",
    "Content-Type": "application/xml; charset=utf-8"
  });
});

siteSeoRoutes.get("/robots.txt", (context) => {
  const base = env.APP_URL.replace(/\/$/, "");
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /dashboard/",
    "Disallow: /api/",
    "Disallow: /admin/",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    ""
  ].join("\n");

  return context.text(body, 200, {
    "Cache-Control": "public, max-age=86400",
    "Content-Type": "text/plain; charset=utf-8"
  });
});
