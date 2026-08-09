import { createTranslator } from "@mma/i18n";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Skeleton } from "@/components/ui/skeleton";
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
import { HowItWorksSection } from "@/features/landing/components/how-it-works-section";
import { InstructorsSection } from "@/features/landing/components/instructors-section";
import { LevelPickerSection } from "@/features/landing/components/level-picker-section";
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
      {/* The carousel is full-bleed, so its placeholder is too — a contained
          block here and a full-width slide after the loader lands is a jump. */}
      <Skeleton className="h-[30rem] w-full sm:h-[34rem] lg:h-[40rem]" />
    </PublicLayout>
  );
}

function HomePage(): JSX.Element {
  const snapshot = Route.useLoaderData() ?? EMPTY_SNAPSHOT;

  return (
    <PublicLayout>
      {/* Catalogue first, persuasion after it — the order the researched
          Bangladeshi platforms converge on (docs/landing-bd-edtech-patterns.md).
          There is no hero: the page opens on a course filling the width, then
          says where to start, what a course contains, what happens after
          paying, who teaches it, who rates it, and the questions that block a
          purchase. It ends on the FAQ — the closing band was removed with the
          hero, so the last thing before the footer is an answer. */}
      <CourseCarouselSection courses={snapshot.courses} />
      <SubjectRailSection categories={snapshot.categories} />
      <LevelPickerSection
        categories={snapshot.categories}
        courses={snapshot.courses}
        publishedCourses={snapshot.stats.publishedCourses}
      />
      <PlatformFeaturesSection />
      <HowItWorksSection />
      <InstructorsSection teachers={snapshot.teachers} />
      <ReviewsSection />
      <FaqSection />
    </PublicLayout>
  );
}
