import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { courseMetaParts } from "@/components/courses/course-meta";
import { Avatar } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";
import { RingedPlay } from "@/components/ui/doodles";
import { RatingStars } from "@/components/ui/rating-stars";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { CourseDetail } from "@/lib/api/courses";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { hueForKey, spectrumClasses } from "@/lib/spectrum";

interface CourseHeroProps {
  readonly course: CourseDetail;
  /** The first lesson anyone can watch, if the course keeps one open. */
  readonly firstPreviewLessonId: string | null;
  readonly onPreview: (lessonId: string) => void;
  readonly reviewSummary: { average: number; count: number } | null;
}

/**
 * The band the page opens on: what the course is, who teaches it, and the cover
 * with the free class sitting on top of it.
 *
 * The cover used to be stranded halfway down the left column, under the title,
 * the description and a row of grey pills — the most persuasive thing on the
 * page, below the fold on a laptop. Here it is beside the title, and the free
 * lesson is a button on it rather than a row buried in the accordion.
 */
export function CourseHero({
  course,
  firstPreviewLessonId,
  onPreview,
  reviewSummary
}: CourseHeroProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const hue = spectrumClasses(hueForKey(course.category.slug));
  const meta = courseMetaParts(course.stats, t, format);

  return (
    <section className="border-b border-hairline bg-panel-warm">
      <div className="mx-auto w-full max-w-[90rem] space-y-8 px-4 py-8 sm:px-8 lg:px-14 lg:py-12">
        <BackButton to="/courses" />

        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,44%)] lg:items-center lg:gap-14">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                className={`rounded-[var(--radius-pill)] px-3 py-1 text-sm font-medium ${hue.chip}`}
                params={{ slug: course.category.slug }}
                to="/categories/$slug"
              >
                {course.category.name}
              </Link>
              {course.isExamOnly ? (
                <span className="rounded-[var(--radius-pill)] border border-hairline px-3 py-1 text-sm text-accent">
                  {t("course.examOnly")}
                </span>
              ) : null}
            </div>

            <h1 className="max-w-[20ch] text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              {course.title}
            </h1>

            <RichTextContent
              className="line-clamp-4 max-w-[56ch] text-lg font-light leading-relaxed text-muted"
              html={course.description}
            />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-base text-muted">
              {reviewSummary && reviewSummary.count > 0 ? (
                <span className="flex items-center gap-2">
                  <RatingStars rating={reviewSummary.average} />
                  <span className="text-ink">{format.rating(reviewSummary.average)}</span>
                  <span className="text-muted-light">
                    ({format.number(reviewSummary.count)})
                  </span>
                </span>
              ) : null}
              {meta.map((part) => (
                <span key={part}>{part}</span>
              ))}
            </div>

            {course.teachers.length === 0 ? null : (
              <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
                <span className="label-mono text-xs uppercase text-muted-faint">
                  {t("detail.taughtBy")}
                </span>
                {course.teachers.map((teacher) => (
                  <span className="flex items-center gap-2" key={teacher.id}>
                    <Avatar className="size-8" name={teacher.name} photo={teacher.profilePhoto} />
                    <span className="text-base text-ink">{teacher.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="relative aspect-video overflow-hidden border border-hairline bg-placeholder-fill">
            {course.coverImageUrl ? (
              <ResponsiveImage
                alt={course.title}
                className="size-full object-cover"
                fetchPriority="high"
                loading="eager"
                sizes="(min-width: 1024px) 42vw, 100vw"
                src={course.coverImageUrl}
              />
            ) : (
              <span className="label-mono flex size-full items-center justify-center text-xs uppercase text-muted-faint">
                {t("course.noThumbnail")}
              </span>
            )}

            {/* The one thing a visitor can do before paying. It sits on the
                cover because that is where they are already looking. */}
            {firstPreviewLessonId === null ? null : (
              <button
                className="absolute inset-x-3 bottom-3 flex min-h-11 items-center justify-center gap-2.5 rounded-[var(--radius-pill)] border border-hairline bg-paper px-5 text-base text-ink transition-colors hover:border-accent hover:text-accent"
                onClick={() => onPreview(firstPreviewLessonId)}
                type="button"
              >
                <RingedPlay />
                <span>{t("detail.previewOpen")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
