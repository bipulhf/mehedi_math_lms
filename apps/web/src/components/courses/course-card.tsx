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
import { hueForKey, spectrumClasses } from "@/lib/spectrum";
import { cn } from "@/lib/utils";

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
 * schema holds one price and no seat column.
 */
export function CourseCard({ course, managementHref }: CourseCardProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const teacher = course.teachers[0];
  const extraTeachers = course.teachers.length - 1;
  const meta = courseMetaParts(course.stats, t, format);

  const cardClass =
    "group flex h-full flex-col border border-hairline bg-card transition-colors duration-300 hover:border-line-strong";

  const body = (
    <>
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

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-light">
          {/* The subject, in its own colour — the same subject is the same
              colour on every card and every page. ADR-0011. */}
          <span className={cn("font-medium", spectrumClasses(hueForKey(course.category.slug)).text)}>
            {course.category.name}
          </span>
          {meta.map((part) => (
            <span key={part}>· {part}</span>
          ))}
        </div>

        <h3 className="text-xl font-medium leading-snug text-ink">{course.title}</h3>

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
            <span className="text-base text-accent">{t("course.enroll")} →</span>
          )}
        </div>
      </div>
    </>
  );

  // A management row keeps its separate edit button, so it cannot fold into a
  // single link. The catalogue card is one link over the whole surface.
  return managementHref ? (
    <div className={cardClass}>{body}</div>
  ) : (
    <Link className={cardClass} params={{ slug: course.slug }} to="/courses/$slug">
      {body}
    </Link>
  );
}

/**
 * The catalogue grid's placeholder. `className` takes the caller's own grid,
 * because the two pages that show course cards do not use the same one and a
 * placeholder in the wrong number of columns reshuffles on arrival.
 */
export function CourseGridSkeleton({
  cardClassName = "h-[22rem] w-full",
  cards = 6,
  className = "grid gap-5 sm:grid-cols-2"
}: {
  cardClassName?: string;
  cards?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={className}>
      {Array.from({ length: cards }, (_, index) => (
        <Skeleton className={cardClassName} key={index} />
      ))}
    </div>
  );
}

/**
 * The list row — the catalogue's alternative to `CourseCard` when the view
 * toggle is set to list. Same facts, laid out horizontally so several fit a
 * screen of results.
 */
export function CourseListCard({ course }: { course: CourseSummary }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const teacher = course.teachers[0];
  const extraTeachers = course.teachers.length - 1;
  const meta = courseMetaParts(course.stats, t, format);

  return (
    <Link
      className="group flex h-full flex-col border border-hairline bg-card transition-colors duration-300 hover:border-line-strong sm:flex-row"
      params={{ slug: course.slug }}
      to="/courses/$slug"
    >
      <div className="shrink-0 sm:w-56">
        <div className="relative flex h-32 items-center justify-center overflow-hidden bg-placeholder-fill sm:h-full">
          {course.coverImageUrl ? (
            <ResponsiveImage
              alt={course.title}
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(min-width: 640px) 224px, 100vw"
              src={course.coverImageUrl}
            />
          ) : (
            <span className="label-mono text-xs uppercase text-muted-faint transition-transform duration-300 group-hover:scale-105">
              {t("course.noThumbnail")}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-light">
          {/* The subject, in its own colour — the same subject is the same
              colour on every card and every page. ADR-0011. */}
          <span className={cn("font-medium", spectrumClasses(hueForKey(course.category.slug)).text)}>
            {course.category.name}
          </span>
          {meta.map((part) => (
            <span key={part}>· {part}</span>
          ))}
        </div>

        <h3 className="text-xl font-medium leading-snug text-ink">{course.title}</h3>

        <RichTextContent
          className="line-clamp-2 text-base font-light leading-relaxed text-muted"
          html={course.description}
        />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-hairline-faint pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <PriceText amount={course.price} className="text-lg" />
            {teacher ? (
              <span className="flex items-center gap-2.5 text-sm text-muted">
                <Avatar className="size-7" name={teacher.name} photo={teacher.profilePhoto} />
                <span className="truncate">
                  {teacher.name}
                  {extraTeachers > 0 ? ` +${format.number(extraTeachers)}` : ""}
                </span>
              </span>
            ) : null}
            {course.stats.reviewCount > 0 ? (
              <span className="text-sm text-muted-light">
                {format.rating(course.stats.reviewAverage ?? 0)} ·{" "}
                {t("course.reviews", { count: format.number(course.stats.reviewCount) })}
              </span>
            ) : null}
          </div>

          <span className="text-base text-accent">{t("course.enroll")} →</span>
        </div>
      </div>
    </Link>
  );
}
