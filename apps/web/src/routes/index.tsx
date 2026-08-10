import { createTranslator } from "@mma/i18n";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import type { LandingSnapshot } from "@/lib/api/landing";
import { faqPageJsonLd, itemListJsonLd, organizationJsonLd, seo } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { ssrApiGet } from "@/lib/ssr-api";

const FAQ_KEYS = [
  { answerKey: "faq.a1", questionKey: "faq.q1" },
  { answerKey: "faq.a2", questionKey: "faq.q2" },
  { answerKey: "faq.a3", questionKey: "faq.q3" },
  { answerKey: "faq.a4", questionKey: "faq.q4" }
] as const;

import { PublicLayout } from "@/components/layout/public-layout";
import { FaqSection } from "@/features/landing/components/faq-section";
import { CourseCarouselSection } from "@/features/landing/components/course-carousel-section";
import { FormulaBandSection } from "@/features/landing/components/formula-band-section";
import { FormulaMarqueeSection } from "@/features/landing/components/formula-marquee-section";
import { HeroSection } from "@/features/landing/components/hero-section";
import { HowItWorksSection } from "@/features/landing/components/how-it-works-section";
import { InstructorsSection } from "@/features/landing/components/instructors-section";
import { LandingSkeleton } from "@/features/landing/components/landing-skeleton";
import { LevelPickerSection } from "@/features/landing/components/level-picker-section";
import { MathRailSection } from "@/features/landing/components/math-rail-section";
import { PlatformFeaturesSection } from "@/features/landing/components/platform-features-section";
import { ReviewsSection } from "@/features/landing/components/reviews-section";
import { SubjectRailSection } from "@/features/landing/components/subject-rail-section";

const EMPTY_SNAPSHOT: LandingSnapshot = {
  categories: [],
  courses: [],
  stats: { publishedCourses: 0, rating: null, students: 0, teachers: 0 },
  teachers: []
};

export const Route = createFileRoute("/")({
  head: ({ loaderData, match }) => {
    const courses = loaderData?.courses ?? [];
    const t = createTranslator(match.context.locale);
    const faq = faqPageJsonLd(
      FAQ_KEYS.map((key) => ({ answer: t(key.answerKey), question: t(key.questionKey) }))
    );

    return seo({
      description: siteConfig.description,
      jsonLd:
        courses.length > 0
          ? [
              organizationJsonLd(),
              itemListJsonLd(
                "Featured courses",
                "Recently published courses at Mehedi's Math Academy.",
                courses.map((course) => ({
                  name: course.title,
                  path: `/courses/${course.slug}`
                }))
              ),
              faq
            ]
          : [organizationJsonLd(), faq],
      path: "/",
      title: "Learn from Bangladesh's Best Teachers"
    });
  },
  loader: async () => ssrApiGet<LandingSnapshot>("/landing"),
  component: HomePage,
  errorComponent: RouteErrorView,
  pendingComponent: HomePageSkeleton
});

function HomePageSkeleton(): JSX.Element {
  return (
    <PublicLayout>
      <LandingSkeleton />
    </PublicLayout>
  );
}

function HomePage(): JSX.Element {
  const snapshot = Route.useLoaderData() ?? EMPTY_SNAPSHOT;

  return (
    <PublicLayout>
      {/* A hero opens the page, then the catalogue, then persuasion — the
          hero was reintroduced at the owner's request; the rest of the order
          still follows the researched Bangladeshi platforms
          (docs/landing-bd-edtech-patterns.md). The hero's spotlight is the
          same admin-curated top course the carousel below leads with — no
          struck-through price and no invented "seats left" urgency, because
          nothing in the schema backs either. The page still ends on the FAQ,
          an answer rather than a closing CTA band.

          The math-edtech identity is layered in two places: a formula band
          sits between the catalogue and the level picker, declaring the
          subject through the formulae themselves; a math rail names the
          branches of school mathematics; a thin marquee of identities runs
          across the page between the level picker and the platform features,
          the kind of running band that a textbook chapter opens with. */}
      <HeroSection spotlightCourse={snapshot.courses[0]} />
      <CourseCarouselSection courses={snapshot.courses} />
      <SubjectRailSection categories={snapshot.categories} />
      <FormulaBandSection />
      <LevelPickerSection
        categories={snapshot.categories}
        courses={snapshot.courses}
        publishedCourses={snapshot.stats.publishedCourses}
      />
      <FormulaMarqueeSection />
      <MathRailSection />
      <PlatformFeaturesSection />
      <HowItWorksSection />
      <InstructorsSection teachers={snapshot.teachers} />
      <ReviewsSection />
      <FaqSection />
    </PublicLayout>
  );
}
