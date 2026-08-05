import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Avatar } from "@/components/ui/avatar";
import { PriceText } from "@/components/ui/price-text";
import { RatingStars } from "@/components/ui/rating-stars";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import type { LandingCourse } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { hueForKey, spectrumClasses } from "@/lib/spectrum";

/**
 * The landing card.
 *
 * Every Bangladeshi platform a student already uses — 10 Minute School, Shikho,
 * Bohubrihi, Interactive Cares — shows the same six facts on a course tile:
 * a thumbnail, the free rung, the subject, the title, who teaches it, and then
 * a footer of class count, enrolments, rating and price. This card carries all
 * six, because a student comparing two courses is comparing exactly those.
 * See `docs/landing-bd-edtech-patterns.md`.
 *
 * It is deliberately not `CourseCard`: that one reads a `CourseSummary` from
 * the catalogue endpoint and carries management affordances. This reads the
 * landing snapshot and is a link and nothing else.
 */
export function LandingCourseCard({ course }: { course: LandingCourse }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const hue = spectrumClasses(hueForKey(course.category.slug));

  return (
    <Link
      className="group flex h-full flex-col border border-hairline bg-card transition-colors hover:border-line-strong"
      params={{ slug: course.slug }}
      to="/courses/$slug"
    >
      <div className="relative flex h-[160px] items-center justify-center overflow-hidden bg-placeholder-fill">
        {course.coverImageUrl ? (
          <ResponsiveImage
            alt={course.title}
            className="size-full object-cover"
            sizes="(min-width: 1280px) 320px, (min-width: 640px) 45vw, 100vw"
            src={course.coverImageUrl}
          />
        ) : (
          <span className="label-mono text-xs uppercase text-muted-faint">
            {t("course.noThumbnail")}
          </span>
        )}

        {/* The free rung, on the thumbnail where every one of these sites puts
            it. Absent rather than zero when a course keeps nothing open. */}
        {course.freeLectureCount > 0 ? (
          <span className="absolute left-3 top-3 rounded-[var(--radius-pill)] border border-spectrum-teal/30 bg-paper px-3 py-1 text-xs text-spectrum-teal">
            {t("course.freeLessons", { count: format.number(course.freeLectureCount) })}
          </span>
        ) : null}
      </div>

      <div className={`flex flex-1 flex-col gap-3 border-l-2 p-5 ${hue.rule}`}>
        <span className={`text-sm font-medium ${hue.text}`}>{course.category.name}</span>

        <h3 className="line-clamp-2 text-lg font-medium leading-snug text-ink">{course.title}</h3>

        {course.teacher ? (
          <div className="flex items-center gap-2.5 text-sm text-muted">
            <Avatar
              className="size-7"
              name={course.teacher.name}
              photo={course.teacher.profilePhoto}
            />
            <span className="truncate">{course.teacher.name}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-light">
          <span>{t("course.lessons", { count: format.number(course.lectureCount) })}</span>
          {course.studentCount > 0 ? (
            <span>
              · {format.number(course.studentCount)} {t("common.students")}
            </span>
          ) : null}
        </div>

        {course.rating ? (
          <div className="flex items-center gap-2 text-sm text-muted-light">
            <RatingStars rating={course.rating.average} />
            <span className="label-mono text-xs">{format.number(course.rating.count)}</span>
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-hairline-faint pt-4">
          <PriceText amount={course.price} className="text-lg" />
          <span className="text-base text-ink transition-colors group-hover:text-accent">
            {t("course.enroll")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
