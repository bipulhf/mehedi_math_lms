import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { LandingSection } from "@/features/landing/components/landing-section";
import { HeroCoursesCarousel } from "@/features/landing/components/hero-courses-carousel";
import type { LandingCourse } from "@/lib/api/landing";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The catalogue, straight after the hero.
 *
 * This is what a student came for, so it is the first full section rather than
 * something they reach after three bands of persuasion.
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
      title={t("home.featuredTitle")}
    >
      <HeroCoursesCarousel courses={courses} />
    </LandingSection>
  );
}
