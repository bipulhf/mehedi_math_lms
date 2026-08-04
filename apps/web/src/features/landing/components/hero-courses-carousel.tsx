import { Link } from "@tanstack/react-router";
import { useEffect, useState, type FocusEvent, type JSX } from "react";

import { Badge } from "@/components/ui/badge";
import { PriceText } from "@/components/ui/price-text";
import { RatingStars } from "@/components/ui/rating-stars";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import type { LandingCourse } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 6000;
const MAX_FEATURED = 6;

/** One large, auto-advancing course slide for hero. */
export function HeroCoursesCarousel({ courses }: { courses: readonly LandingCourse[] }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const slides = courses.slice(0, MAX_FEATURED);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || slides.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [isPaused, slides.length]);

  if (slides.length === 0) {
    return <></>;
  }

  const goTo = (index: number): void => setActiveIndex(index);
  const goPrevious = (): void => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  };
  const goNext = (): void => {
    setActiveIndex((current) => (current + 1) % slides.length);
  };
  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setIsPaused(false);
  };

  return (
    <section
      aria-label={t("home.featuredTitle")}
      className="pt-12"
      onBlur={handleBlur}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
    >
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="text-xl font-medium text-ink sm:text-2xl">{t("home.featuredTitle")}</h2>
        <span className="font-mono-label text-xs tracking-[0.18em] text-muted-faint">
          {format.number(activeIndex + 1)} / {format.number(slides.length)}
        </span>
      </div>

      <div className="overflow-hidden border border-hairline bg-card">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((course, index) => (
            <CourseSlide course={course} isActive={index === activeIndex} key={course.id} />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2" role="tablist" aria-label={t("home.featuredTitle")}>
          {slides.map((course, index) => (
            <button
              aria-label={`${t("home.featuredTitle")} ${format.number(index + 1)}`}
              aria-selected={index === activeIndex}
              className={cn(
                "h-2.5 rounded-full border border-line-strong",
                index === activeIndex ? "w-8 bg-accent" : "w-2.5 bg-transparent"
              )}
              key={course.id}
              onClick={() => goTo(index)}
              role="tab"
              type="button"
            />
          ))}
        </div>

        <div className="flex gap-2.5">
          <CarouselButton ariaLabel={t("action.previousPage")} direction="left" onClick={goPrevious} />
          <CarouselButton ariaLabel={t("action.nextPage")} direction="right" onClick={goNext} />
        </div>
      </div>
    </section>
  );
}

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
    <Link
      aria-hidden={!isActive}
      className={cn(
        "group grid min-h-[30rem] w-full shrink-0 lg:grid-cols-[1.08fr_0.92fr]",
        !isActive && "pointer-events-none"
      )}
      params={{ slug: course.slug }}
      tabIndex={isActive ? 0 : -1}
      to="/courses/$slug"
    >
      <div className="min-h-[15rem] bg-placeholder-fill lg:min-h-full">
        {course.coverImageUrl ? (
          <ResponsiveImage
            alt={course.title}
            className="size-full object-cover"
            sizes="(min-width: 1024px) 54vw, 100vw"
            src={course.coverImageUrl}
          />
        ) : null}
      </div>

      <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-12">
        <div className="space-y-5">
          <Badge tone="quiet">{course.category.name}</Badge>
          <h3 className="max-w-[16ch] text-3xl font-medium leading-[1.1] tracking-tight text-ink sm:text-4xl lg:text-5xl">
            {course.title}
          </h3>
          <p className="line-clamp-3 max-w-[48ch] text-base leading-relaxed text-muted sm:text-lg">
            {course.description}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-light">
            <span>{t("course.lessons", { count: format.number(course.lectureCount) })}</span>
            {course.teacher ? <span>{course.teacher.name}</span> : null}
            {course.rating ? (
              <span className="flex items-center gap-2">
                <RatingStars rating={course.rating.average} />
                <span className="font-mono-label text-xs">{format.number(course.rating.count)}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-hairline pt-6">
          <PriceText amount={course.price} className="text-xl font-medium" />
          <span className="border-b border-line-strong pb-1 text-base text-ink transition-colors group-hover:border-accent group-hover:text-accent">
            {t("course.enroll")} →
          </span>
        </div>
      </div>
    </Link>
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
      className="flex size-11 items-center justify-center rounded-full border border-line-strong bg-card text-ink transition-colors hover:border-accent hover:text-accent"
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
