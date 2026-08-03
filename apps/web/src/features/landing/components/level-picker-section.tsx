import { Link } from "@tanstack/react-router";
import { useState, type JSX } from "react";

import { DotRow } from "@/components/ui/dot-row";
import { PriceText } from "@/components/ui/price-text";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { SectionHeading } from "@/components/ui/section-heading";
import type { LandingCategory, LandingCourse } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";

const VISIBLE_COURSES = 5;

interface LevelPickerSectionProps {
  readonly categories: readonly LandingCategory[];
  readonly courses: readonly LandingCourse[];
  readonly publishedCourses: number;
}

/**
 * "তুমি কোন লেভেলে?" — levels on the left, the courses under the selected one
 * on the right.
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

  const selected = categories.find((category) => category.slug === levelSlug);

  return (
    <section className="border-y border-hairline">
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[380px_1fr] lg:gap-16 lg:px-14 lg:py-20">
        <div className="space-y-6">
          <SectionHeading description={t("home.levelLead")} title={t("home.levelTitle")} />
          <div>
            <DotRow
              isSelected={levelSlug === null}
              label={t("courses.allLevels")}
              onSelect={() => setLevelSlug(null)}
            />
            {categories.map((category) => (
              <DotRow
                count={format.number(category.courseCount)}
                isSelected={category.slug === levelSlug}
                key={category.id}
                label={category.name}
                onSelect={() => setLevelSlug(category.slug)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-medium text-ink">{selected?.name ?? t("nav.courses")}</h3>

          <div>
            {visible.map((course) => (
              <CourseRow course={course} key={course.id} />
            ))}
          </div>

          <Link
            className="inline-block border-b border-line-strong pb-0.5 text-base text-ink transition-colors duration-150 hover:border-accent hover:text-accent"
            to="/courses"
          >
            {t("home.seeAllCourses", { count: format.number(publishedCourses) })}
          </Link>
        </div>
      </div>
    </section>
  );
}

function CourseRow({ course }: { course: LandingCourse }): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <Link
      className="flex items-center gap-4 border-b border-hairline-faint py-4 transition-colors duration-150 hover:bg-panel-warm"
      params={{ slug: course.slug }}
      to="/courses/$slug"
    >
      <div className="flex h-14 w-[76px] shrink-0 items-center justify-center overflow-hidden bg-placeholder-fill">
        {course.coverImageUrl ? (
          <ResponsiveImage
            alt={course.title}
            className="size-full object-cover"
            sizes="76px"
            src={course.coverImageUrl}
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-ink">{course.title}</p>
        <p className="truncate text-sm text-muted-light">
          {course.teacher?.name ?? course.category.name} ·{" "}
          {t("course.lessons", { count: format.number(course.lectureCount) })}
        </p>
      </div>

      <PriceText amount={course.price} className="hidden shrink-0 text-base sm:block" />
      <span className="shrink-0 text-base text-accent">{t("course.enroll")} →</span>
    </Link>
  );
}
