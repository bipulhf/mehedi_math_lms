import { Link } from "@tanstack/react-router";
import { useState, type JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { FilterPill } from "@/components/ui/pill";
import { PriceText } from "@/components/ui/price-text";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { LandingSection } from "@/features/landing/components/landing-section";
import type { LandingCategory, LandingCourse } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { hueForKey, spectrumClasses } from "@/lib/spectrum";

const VISIBLE_COURSES = 5;

interface LevelPickerSectionProps {
  readonly categories: readonly LandingCategory[];
  readonly courses: readonly LandingCourse[];
  readonly publishedCourses: number;
}

/**
 * "তুমি কোন লেভেলে?" — a row of level tabs, the courses under the selected
 * one below.
 *
 * The landing snapshot only returns root categories, which is exactly the level
 * axis. Filtering is by category slug rather than id because that is what the
 * course rows carry.
 */
export function LevelPickerSection({
  categories,
  courses,
  publishedCourses
}: LevelPickerSectionProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [levelSlug, setLevelSlug] = useState<string | null>(null);

  const visible = (
    levelSlug === null
      ? courses
      : courses.filter((course) => course.category.slug === levelSlug)
  ).slice(0, VISIBLE_COURSES);

  return (
    <LandingSection description={t("home.levelLead")} title={t("home.levelTitle")} tone="warm">
      <div className="space-y-8">
        <Reveal>
          <div className="flex flex-wrap gap-2">
            <FilterPill isSelected={levelSlug === null} onClick={() => setLevelSlug(null)}>
              {t("courses.allLevels")}
              <span className="label-mono ml-2 text-xs opacity-60">
                {format.number(courses.length)}
              </span>
            </FilterPill>
            {categories.map((category) => (
              <FilterPill
                isSelected={category.slug === levelSlug}
                key={category.id}
                onClick={() => setLevelSlug(category.slug)}
              >
                {category.name}
                <span className="label-mono ml-2 text-xs opacity-60">
                  {format.number(category.courseCount)}
                </span>
              </FilterPill>
            ))}
          </div>
        </Reveal>

        <div className="space-y-2">
          <div>
            {visible.map((course, index) => (
              <Reveal delayMs={index * 70} key={course.id}>
                <CourseRow course={course} />
              </Reveal>
            ))}
          </div>

          <Link
            className="inline-block border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-spectrum-ember hover:text-spectrum-ember"
            to="/courses"
          >
            {t("home.seeAllCourses", { count: format.number(publishedCourses) })}
          </Link>
        </div>
      </div>
    </LandingSection>
  );
}

function CourseRow({ course }: { course: LandingCourse }): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <Link
      className={`group flex items-center gap-4 border-b border-l-2 border-hairline-faint px-2 py-4 transition-colors hover:bg-panel-warm ${spectrumClasses(hueForKey(course.category.slug)).rule}`}
      params={{ slug: course.slug }}
      to="/courses/$slug"
    >
      <div className="flex h-14 w-[76px] shrink-0 items-center justify-center overflow-hidden bg-placeholder-fill">
        {course.coverImageUrl ? (
          <ResponsiveImage
            alt={course.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="76px"
            src={course.coverImageUrl}
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-ink transition-colors group-hover:text-accent">{course.title}</p>
        <p className="truncate text-sm text-muted-light">
          {course.teacher?.name ?? course.category.name} ·{" "}
          {t("course.lessons", { count: format.number(course.lectureCount) })}
        </p>
      </div>

      <PriceText amount={course.price} className="hidden shrink-0 text-base sm:block" />
      <span className="shrink-0 text-base text-spectrum-ember">{t("course.enroll")} →</span>
    </Link>
  );
}
