import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { courseMetaParts } from "@/components/courses/course-meta";
import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PriceText } from "@/components/ui/price-text";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseSummary } from "@/lib/api/courses";
import { useFormat, useT } from "@/lib/i18n/locale-context";

interface CourseCardProps {
  course: CourseSummary;
  /** Present only inside the dashboard, where the card is a management row. */
  managementHref?:
    | {
        params?: { id: string } | undefined;
        to: "/dashboard/courses/$id/edit" | "/dashboard/admin/courses";
      }
    | undefined;
}

/**
 * The catalogue card. DESIGN.md §6 and the handoff's Courses screen: a 150px
 * thumbnail, category, meta line, title, one-line description, teacher, then a
 * footer with the price and the accent enrol link.
 *
 * There is no struck-through original price and no seat-count badge — the
 * schema holds one price and no seat column. GENEX_MIGRATION.md §2.
 */
export function CourseCard({ course, managementHref }: CourseCardProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const teacher = course.teachers[0];
  const extraTeachers = course.teachers.length - 1;
  const meta = courseMetaParts(course.stats, t, format);

  return (
    <div className="group flex h-full flex-col border border-hairline bg-card transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-md">
      <Link className="block" params={{ slug: course.slug }} to="/courses/$slug">
        <div className="relative flex h-[150px] items-center justify-center overflow-hidden bg-placeholder-fill">
          {course.coverImageUrl ? (
            <ResponsiveImage
              alt={course.title}
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(min-width: 1024px) 420px, (min-width: 640px) 45vw, 100vw"
              src={course.coverImageUrl}
            />
          ) : (
            <span className="label-mono text-xs uppercase text-muted-faint transition-transform duration-300 group-hover:scale-105">
              {t("course.noThumbnail")}
            </span>
          )}

          {course.isExamOnly ? (
            <span className="absolute left-3 top-3 rounded-[var(--radius-pill)] border border-hairline bg-paper px-3 py-1 text-xs text-accent">
              {t("course.examOnly")}
            </span>
          ) : null}
          {course.status === "PUBLISHED" ? null : (
            <span className="absolute right-3 top-3">
              <CourseStatusBadge status={course.status} />
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-light">
          <span>{course.category.name}</span>
          {meta.map((part) => (
            <span key={part}>· {part}</span>
          ))}
        </div>

        <Link params={{ slug: course.slug }} to="/courses/$slug">
          <h3 className="text-xl font-medium leading-snug text-ink">{course.title}</h3>
        </Link>

        <RichTextContent
          className="line-clamp-2 text-base font-light leading-relaxed text-muted"
          html={course.description}
        />

        {teacher ? (
          <div className="flex items-center gap-2.5 text-sm text-muted">
            <Avatar className="size-7" name={teacher.name} photo={teacher.profilePhoto} />
            <span className="truncate">
              {teacher.name}
              {/* The design assumes one teacher per course; course_teachers
                  allows several, so the rest are counted rather than dropped. */}
              {extraTeachers > 0 ? ` +${format.number(extraTeachers)}` : ""}
            </span>
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-hairline-faint pt-4">
          <div>
            <PriceText amount={course.price} className="text-lg" />
            {course.stats.reviewCount > 0 ? (
              <p className="text-sm text-muted-light">
                {format.rating(course.stats.reviewAverage ?? 0)} ·{" "}
                {t("course.reviews", { count: format.number(course.stats.reviewCount) })}
              </p>
            ) : null}
          </div>

          {managementHref ? (
            <Button asChild size="sm" variant="outline">
              {managementHref.params ? (
                <Link params={managementHref.params} to={managementHref.to}>
                  {t("action.edit")}
                </Link>
              ) : (
                <Link to={managementHref.to}>{t("action.edit")}</Link>
              )}
            </Button>
          ) : (
            <Link
              className="text-base text-accent transition-colors hover:brightness-90"
              params={{ slug: course.slug }}
              to="/courses/$slug"
            >
              {t("course.enroll")} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function CourseGridSkeleton(): JSX.Element {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton className="h-[22rem] w-full" key={index} />
      ))}
    </div>
  );
}
