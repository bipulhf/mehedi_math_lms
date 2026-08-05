import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { LandingCourseCard } from "@/features/landing/components/landing-course-card";
import { LandingSection } from "@/features/landing/components/landing-section";
import type { LandingCourse } from "@/lib/api/landing";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The catalogue, straight after the hero.
 *
 * A grid rather than the single large auto-advancing slide this used to be:
 * every Bangladeshi platform a student already uses shows six to twelve courses
 * at once, and one slide showed one. `docs/landing-bd-edtech-patterns.md` §5.
 */
export function FeaturedCoursesSection({
  courses
}: {
  courses: readonly LandingCourse[];
}): JSX.Element | null {
  const t = useT();

  if (courses.length === 0) {
    return null;
  }

  return (
    <LandingSection
      action={
        <Link
          className="border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-spectrum-ember hover:text-spectrum-ember"
          to="/courses"
        >
          {t("action.viewAllCourses")}
        </Link>
      }
      description={t("home.featuredLead")}
      eyebrow={t("home.featuredEyebrow")}
      title={t("home.featuredTitle")}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses.map((course, index) => (
          <Reveal delayMs={(index % 4) * 70} key={course.id}>
            <LandingCourseCard course={course} />
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}
