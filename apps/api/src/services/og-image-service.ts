import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";

import type { CourseRepository } from "@/repositories/course-repository";
import type { ProfileRepository } from "@/repositories/profile-repository";
import { NotFoundError } from "@/utils/errors";

export type PngBytes = Uint8Array<ArrayBuffer>;

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const brandMarkDataUri = `data:image/png;base64,${readFileSync(
  new URL("../assets/mma-mark.png", import.meta.url)
).toString("base64")}`;

function escapeSvgText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function renderOgSvg(primary: string, secondary: string | null): string {
  const p = escapeSvgText(truncate(primary, 72));
  const s = secondary ? escapeSvgText(truncate(secondary, 96)) : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" viewBox="0 0 ${OG_IMAGE_WIDTH} ${OG_IMAGE_HEIGHT}">
  <!-- Warm paper, ink text, one accent rule. DESIGN.md §2 — no gradient, and
       the accent appears once. Flat fills also survive rasterisation to PNG
       more predictably than a gradient does. -->
  <rect width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" fill="#fcfbf9"/>
  <rect x="0" y="0" width="${OG_IMAGE_WIDTH}" height="8" fill="#ee5622"/>
  <image href="${brandMarkDataUri}" x="980" y="72" width="140" height="140" preserveAspectRatio="xMidYMid meet"/>
  <text x="80" y="220" fill="#23211e" font-family="Helvetica,Arial,sans-serif" font-size="54" font-weight="500">${p}</text>
  ${
    s.length > 0
      ? `<text x="80" y="300" fill="#6b6763" font-family="Helvetica,Arial,sans-serif" font-size="28">${s}</text>`
      : ""
  }
  <rect x="80" y="520" width="${OG_IMAGE_WIDTH - 160}" height="1" fill="#e8e4de"/>
  <text x="80" y="570" fill="#8a857d" font-family="Helvetica,Arial,sans-serif" font-size="22" letter-spacing="2">MEHEDI&apos;S MATH ACADEMY</text>
</svg>`;
}

/**
 * Social platforms (Facebook, X, LinkedIn, WhatsApp, Slack, iMessage) all reject
 * `image/svg+xml` for `og:image`, so the SVG above is only ever an intermediate
 * representation — every endpoint hands out a rasterised PNG.
 */
function rasterise(svg: string): PngBytes {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_IMAGE_WIDTH },
    font: { defaultFontFamily: "sans-serif", loadSystemFonts: true }
  });

  // Copy onto a plain ArrayBuffer — resvg hands back a Node Buffer, which Hono's
  // body() overloads do not accept.
  return new Uint8Array(resvg.render().asPng());
}

export class OgImageService {
  private defaultPngCache: PngBytes | null = null;

  public constructor(
    private readonly courseRepository: CourseRepository,
    private readonly profileRepository: ProfileRepository
  ) {}

  public defaultPng(): PngBytes {
    this.defaultPngCache ??= rasterise(
      renderOgSvg("Mehedi's Math Academy", "Structured math courses and academic clarity.")
    );

    return this.defaultPngCache;
  }

  public async courseOgPng(slug: string): Promise<PngBytes> {
    const course = await this.courseRepository.findBySlug(slug);

    if (!course || course.status !== "PUBLISHED") {
      throw new NotFoundError("Course not found");
    }

    const priceLabel =
      Number(course.price) > 0 ? `BDT ${Number(course.price).toFixed(2)}` : "Free to start";

    return rasterise(renderOgSvg(course.title, priceLabel));
  }

  public async teacherOgPng(slug: string): Promise<PngBytes> {
    const teacher = await this.profileRepository.findPublicTeacherBySlug(slug);

    if (!teacher) {
      throw new NotFoundError("Teacher profile not found");
    }

    const subtitle = teacher.teacherProfile?.bio
      ? truncate(teacher.teacherProfile.bio.replace(/\s+/g, " ").trim(), 120)
      : "Teacher · Mehedi's Math Academy";

    return rasterise(renderOgSvg(teacher.name, subtitle));
  }
}
