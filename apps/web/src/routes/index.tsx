import { createTranslator } from "@genex/i18n";
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
import { CtaSection } from "@/features/landing/components/cta-section";
import { FaqSection } from "@/features/landing/components/faq-section";
import { HeroSection } from "@/features/landing/components/hero-section";
import { InstructorsSection } from "@/features/landing/components/instructors-section";
import { LevelPickerSection } from "@/features/landing/components/level-picker-section";
import { ReviewsSection } from "@/features/landing/components/reviews-section";

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
                "Recently published courses at Genex.",
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
      <div className="mx-auto grid w-full max-w-[90rem] gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_420px] lg:px-14 lg:py-24">
        <div className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-4/5" />
          <Skeleton className="h-12 w-2/3" />
        </div>
        <Skeleton className="hidden aspect-4/5 w-full lg:block" />
      </div>
    </PublicLayout>
  );
}

function HomePage(): JSX.Element {
  const snapshot = Route.useLoaderData() ?? EMPTY_SNAPSHOT;

  return (
    <PublicLayout>
      <HeroSection stats={snapshot.stats} />
      <LevelPickerSection
        categories={snapshot.categories}
        courses={snapshot.courses}
        publishedCourses={snapshot.stats.publishedCourses}
      />
      <InstructorsSection teachers={snapshot.teachers} />
      <ReviewsSection />
      <FaqSection />
      <CtaSection />
    </PublicLayout>
  );
}
