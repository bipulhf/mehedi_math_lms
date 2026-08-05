import { Link } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties, type FocusEvent, type JSX } from "react";

import { Button } from "@/components/ui/button";
import { PriceText } from "@/components/ui/price-text";
import { RatingStars } from "@/components/ui/rating-stars";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import type { LandingCourse } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 6500;

/** How far behind the segment above it one part of the slide's copy arrives. */
function riseDelay(delayMs: number): CSSProperties {
  return { "--rise-delay": `${delayMs}ms` } as CSSProperties;
}

/**
 * The page opens on the catalogue itself: one course filling the width, its
 * details written over the picture rather than beside it.
 *
 * There is no hero above this and no card grid below it — the courses are the
 * only thing at the top of the page, which is what the owner asked for and what
 * 10 Minute School does with its class cards.
 * `docs/landing-bd-edtech-patterns.md` §4.
 */
export function CourseCarouselSection({
  courses
}: {
  courses: readonly LandingCourse[];
}): JSX.Element | null {
  const t = useT();
  const format = useFormat();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(courses.length - 1, 0)));
  }, [courses.length]);

  useEffect(() => {
    if (isPaused || courses.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % courses.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [isPaused, courses.length]);

  if (courses.length === 0) {
    return null;
  }

  // Focus leaving the whole region resumes it; focus moving between the arrows
  // inside it does not.
  const handleBlur = (event: FocusEvent<HTMLElement>): void => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setIsPaused(false);
  };

  return (
    <section
      aria-label={t("home.featuredTitle")}
      className="border-b border-hairline"
      onBlur={handleBlur}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative overflow-hidden bg-placeholder-fill">
        <div
          className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {courses.map((course, index) => (
            <CourseSlide course={course} isActive={index === activeIndex} key={course.id} />
          ))}
        </div>

        {courses.length < 2 ? null : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 px-4 pb-6 sm:px-8 lg:px-14 lg:pb-8">
              <div
                aria-label={t("home.featuredTitle")}
                className="pointer-events-auto flex items-center gap-2"
                role="tablist"
              >
                {courses.map((course, index) => (
                  <button
                    aria-label={`${t("home.featuredTitle")} ${format.number(index + 1)}`}
                    aria-selected={index === activeIndex}
                    className={cn(
                      "h-1.5 rounded-full border border-paper/50 transition-all",
                      index === activeIndex ? "w-9 bg-paper" : "w-4 bg-paper/25"
                    )}
                    key={course.id}
                    onClick={() => setActiveIndex(index)}
                    role="tab"
                    type="button"
                  />
                ))}
              </div>

              <div className="pointer-events-auto flex gap-2.5">
                <CarouselButton
                  ariaLabel={t("action.previousPage")}
                  direction="left"
                  onClick={() =>
                    setActiveIndex((current) => (current - 1 + courses.length) % courses.length)
                  }
                />
                <CarouselButton
                  ariaLabel={t("action.nextPage")}
                  direction="right"
                  onClick={() => setActiveIndex((current) => (current + 1) % courses.length)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * One slide. The picture is the surface and everything else sits on it, so the
 * text needs its own contrast: a dark wash from the bottom edge, not a tint over
 * the whole frame, which would flatten the photograph it is there to show.
 *
 * `data-slide-active` drives the stagger: each segment of the copy rises in
 * behind the one above it every time this slide takes its turn, and drops back
 * without delay when it leaves. The rule lives in `app.css` (ADR-0012).
 */
function CourseSlide({
  course,
  isActive
}: {
  course: LandingCourse;
  isActive: boolean;
}): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <div
      aria-hidden={!isActive}
      className="relative h-[30rem] w-full shrink-0 sm:h-[34rem] lg:h-[40rem]"
      data-slide-active={isActive}
    >
      {course.coverImageUrl ? (
        <ResponsiveImage
          alt=""
          className="absolute inset-0 size-full object-cover"
          sizes="100vw"
          src={course.coverImageUrl}
        />
      ) : null}

      {/* Two washes, both weighted to the corner the words are in — up from the
          bottom edge and in from the left. Darkening the whole frame instead
          would flatten the photograph the slide exists to show. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/20 to-transparent"
      />

      <div className="relative flex h-full items-end">
        <div className="mx-auto w-full max-w-[90rem] px-4 pb-20 pt-10 sm:px-8 lg:px-14 lg:pb-24">
          {/* A block in the bottom-left corner, not a band across the frame:
              the measure is narrow enough that the title stacks into two or
              three lines and the picture is left visible beside it. */}
          <div className="max-w-[40rem]">
            <div
              className="slide-rise flex flex-wrap items-center gap-2.5"
              style={riseDelay(0)}
            >
              <span className="rounded-[var(--radius-pill)] border border-paper/30 bg-paper/10 px-3 py-1 text-sm text-paper backdrop-blur-sm">
                {course.category.name}
              </span>
              {course.freeLectureCount > 0 ? (
                <span className="rounded-[var(--radius-pill)] border border-paper/30 bg-paper px-3 py-1 text-sm text-ink">
                  {t("course.freeLessons", { count: format.number(course.freeLectureCount) })}
                </span>
              ) : null}
            </div>

            <h2 className="slide-rise mt-5" style={riseDelay(90)}>
              <Link
                className="font-medium leading-[1.05] tracking-[-0.02em] text-paper transition-opacity hover:opacity-80"
                params={{ slug: course.slug }}
                style={{ fontSize: "var(--text-display)" }}
                tabIndex={isActive ? 0 : -1}
                to="/courses/$slug"
              >
                {course.title}
              </Link>
            </h2>

            <p
              className="slide-rise mt-4 line-clamp-2 text-base font-light leading-relaxed text-paper/85 sm:text-lg"
              style={riseDelay(180)}
            >
              {course.description}
            </p>

            <div
              className="slide-rise mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-paper/75"
              style={riseDelay(270)}
            >
              {course.teacher ? <span className="text-paper">{course.teacher.name}</span> : null}
              <span>{t("course.lessons", { count: format.number(course.lectureCount) })}</span>
              {course.studentCount > 0 ? (
                <span>
                  {format.number(course.studentCount)} {t("common.students")}
                </span>
              ) : null}
              {course.rating ? (
                <span className="flex items-center gap-2">
                  <RatingStars rating={course.rating.average} />
                  <span className="label-mono text-sm">{format.number(course.rating.count)}</span>
                </span>
              ) : null}
            </div>

            <div className="slide-rise mt-7 flex flex-wrap items-center gap-5" style={riseDelay(360)}>
              <Button asChild className="h-12 px-8 text-base" size="lg" tabIndex={isActive ? 0 : -1}>
                <Link params={{ slug: course.slug }} to="/courses/$slug">
                  {t("course.enroll")}
                </Link>
              </Button>
              <PriceText amount={course.price} className="text-xl text-paper" />
              <Link
                className="border-b border-paper/40 pb-0.5 text-base text-paper transition-colors hover:border-paper"
                tabIndex={isActive ? 0 : -1}
                to="/courses"
              >
                {t("action.viewAllCourses")} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselButton({
  ariaLabel,
  direction,
  onClick
}: {
  ariaLabel: string;
  direction: "left" | "right";
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      aria-label={ariaLabel}
      className="flex size-11 items-center justify-center rounded-full border border-paper/40 bg-ink/30 text-paper backdrop-blur-sm transition-colors hover:bg-paper hover:text-ink"
      onClick={onClick}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "block size-2.5 border-r-2 border-t-2 border-current",
          direction === "right" ? "rotate-45" : "rotate-[225deg]"
        )}
      />
    </button>
  );
}
