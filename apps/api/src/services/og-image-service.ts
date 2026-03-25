import { CourseRepository } from "@/repositories/course-repository";
import { ProfileRepository } from "@/repositories/profile-repository";
import { NotFoundError } from "@/utils/errors";

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
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6063ee"/>
      <stop offset="100%" style="stop-color:#131b2e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="80" y="200" fill="#faf8ff" font-family="Helvetica,Arial,sans-serif" font-size="52" font-weight="700">${p}</text>
  ${
    s.length > 0
      ? `<text x="80" y="290" fill="#dae2fd" font-family="Helvetica,Arial,sans-serif" font-size="28">${s}</text>`
      : ""
  }
  <text x="80" y="560" fill="#dae2fd" font-family="Helvetica,Arial,sans-serif" font-size="22">Mehedi's Math Academy</text>
</svg>`;
}

export class OgImageService {
  public constructor(
    private readonly courseRepository: CourseRepository,
    private readonly profileRepository: ProfileRepository
  ) {}

  public defaultSvg(): string {
    return renderOgSvg("Mehedi's Math Academy", "Structured math courses and academic clarity.");
  }

  public async courseOgSvg(slug: string): Promise<string> {
    const course = await this.courseRepository.findBySlug(slug);

    if (!course || course.status !== "PUBLISHED") {
      throw new NotFoundError("Course not found");
    }

    const priceLabel =
      Number(course.price) > 0 ? `BDT ${Number(course.price).toFixed(2)}` : "Free to start";

    return renderOgSvg(course.title, priceLabel);
  }

  public async teacherOgSvg(slug: string): Promise<string> {
    const teacher = await this.profileRepository.findPublicTeacherBySlug(slug);

    if (!teacher) {
      throw new NotFoundError("Teacher profile not found");
    }

    const subtitle = teacher.teacherProfile?.bio
      ? truncate(teacher.teacherProfile.bio.replace(/\s+/g, " ").trim(), 120)
      : "Teacher · Mehedi's Math Academy";

    return renderOgSvg(teacher.name, subtitle);
  }
}
