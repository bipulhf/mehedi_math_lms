import { Resvg } from "@resvg/resvg-js";

import type { CourseRepository } from "@/repositories/course-repository";
import type { ProfileRepository } from "@/repositories/profile-repository";
import { NotFoundError } from "@/utils/errors";

export type PngBytes = Uint8Array<ArrayBuffer>;

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

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
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6063ee"/>
      <stop offset="100%" style="stop-color:#131b2e"/>
    </linearGradient>
  </defs>
  <rect width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" fill="url(#g)"/>
  <text x="80" y="200" fill="#faf8ff" font-family="Helvetica,Arial,sans-serif" font-size="52" font-weight="700">${p}</text>
  ${
    s.length > 0
      ? `<text x="80" y="290" fill="#dae2fd" font-family="Helvetica,Arial,sans-serif" font-size="28">${s}</text>`
      : ""
  }
  <text x="80" y="560" fill="#dae2fd" font-family="Helvetica,Arial,sans-serif" font-size="22">Mehedi's Math Academy</text>
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
