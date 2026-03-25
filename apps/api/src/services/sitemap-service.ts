import type Redis from "ioredis";

import { env } from "@/lib/env";
import { SeoRepository } from "@/repositories/seo-repository";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export class SitemapService {
  private static readonly CACHE_KEY = "seo:sitemap:v1";
  private static readonly TTL_SECONDS = 3600;

  public constructor(
    private readonly seoRepository: SeoRepository,
    private readonly redis: Redis
  ) {}

  public async getSitemapXml(): Promise<string> {
    const cached = await this.redis.get(SitemapService.CACHE_KEY);

    if (cached) {
      return cached;
    }

    const base = stripTrailingSlash(env.APP_URL);
    const [courseRows, categoryRows, teacherRows] = await Promise.all([
      this.seoRepository.listPublishedCoursesForSitemap(),
      this.seoRepository.listActiveCategoriesForSitemap(),
      this.seoRepository.listTeachersForSitemap()
    ]);

    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    const pushUrl = (loc: string, lastmod: Date, changefreq: string, priority: string): void => {
      lines.push("<url>");
      lines.push(`<loc>${escapeXml(loc)}</loc>`);
      lines.push(`<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`);
      lines.push(`<changefreq>${changefreq}</changefreq>`);
      lines.push(`<priority>${priority}</priority>`);
      lines.push("</url>");
    };

    const today = new Date();

    pushUrl(`${base}/`, today, "daily", "1.0");
    pushUrl(`${base}/courses`, today, "weekly", "0.9");
    pushUrl(`${base}/categories`, today, "weekly", "0.8");
    pushUrl(`${base}/about`, today, "monthly", "0.5");
    pushUrl(`${base}/contact`, today, "monthly", "0.5");
    pushUrl(`${base}/login`, today, "monthly", "0.4");
    pushUrl(`${base}/signup`, today, "monthly", "0.4");

    for (const row of courseRows) {
      pushUrl(`${base}/courses/${row.slug}`, row.updatedAt, "weekly", "0.9");
    }

    for (const row of categoryRows) {
      pushUrl(`${base}/categories/${row.slug}`, row.updatedAt, "weekly", "0.8");
    }

    for (const row of teacherRows) {
      if (row.slug.length === 0) {
        continue;
      }

      pushUrl(`${base}/teachers/${row.slug}`, row.updatedAt, "weekly", "0.7");
    }

    lines.push("</urlset>");
    const xml = lines.join("");

    await this.redis.setex(SitemapService.CACHE_KEY, SitemapService.TTL_SECONDS, xml);

    return xml;
  }
}
