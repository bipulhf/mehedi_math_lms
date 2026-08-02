import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Skeleton } from "@/components/ui/skeleton";
import type { LandingSnapshot } from "@/lib/api/landing";
import { itemListJsonLd, organizationJsonLd, seo } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { ssrApiGet } from "@/lib/ssr-api";

// Landing page components
import { CategoriesSection } from "@/features/landing/components/categories-section";
import { CoursesSection } from "@/features/landing/components/courses-section";
import { CtaSection } from "@/features/landing/components/cta-section";
import { HeroSection } from "@/features/landing/components/hero-section";
import { InstructorsSection } from "@/features/landing/components/instructors-section";
import { LandingLayout } from "@/features/landing/components/landing-layout";
import { StatsSection } from "@/features/landing/components/stats-section";

const EMPTY_SNAPSHOT: LandingSnapshot = {
  categories: [],
  courses: [],
  stats: { publishedCourses: 0, rating: null, students: 0, teachers: 0 },
  teachers: []
};

export const Route = createFileRoute("/")({
  head: ({ loaderData }) => {
    const courses = loaderData?.courses ?? [];

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
              )
            ]
          : [organizationJsonLd()],
      path: "/",
      title: "Mehedi's Math Academy | The Digital Atelier for High-Performance Learning"
    });
  },
  loader: async () => ssrApiGet<LandingSnapshot>("/landing"),
  component: HomePage,
  errorComponent: RouteErrorView,
  pendingComponent: HomePageSkeleton
});

function HomePageSkeleton(): JSX.Element {
  return (
    <LandingLayout>
      <section className="max-w-7xl mx-auto px-8 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <Skeleton className="h-6 w-56 rounded-full" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-4/5 rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
        <Skeleton className="aspect-square w-full rounded-[2rem]" />
      </section>
      <section className="bg-surface-container-low py-20 px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-16">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-16 w-40 rounded-2xl" />
          ))}
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-8 py-32 grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-[26rem] w-full rounded-4xl" />
        ))}
      </section>
    </LandingLayout>
  );
}

function HomePage(): JSX.Element {
  const snapshot = Route.useLoaderData() ?? EMPTY_SNAPSHOT;

  return (
    <LandingLayout>
      <HeroSection stats={snapshot.stats} />
      <StatsSection stats={snapshot.stats} />
      <CategoriesSection categories={snapshot.categories} />
      <CoursesSection
        courses={snapshot.courses}
        publishedCourses={snapshot.stats.publishedCourses}
      />
      <InstructorsSection teachers={snapshot.teachers} />
      <CtaSection />
    </LandingLayout>
  );
}
