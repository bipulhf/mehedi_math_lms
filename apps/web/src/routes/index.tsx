import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { organizationJsonLd, seo } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

// Landing page components
import { CategoriesSection } from "@/features/landing/components/categories-section";
import { CoursesSection } from "@/features/landing/components/courses-section";
import { CtaSection } from "@/features/landing/components/cta-section";
import { HeroSection } from "@/features/landing/components/hero-section";
import { InstructorsSection } from "@/features/landing/components/instructors-section";
import { LandingLayout } from "@/features/landing/components/landing-layout";
import { StatsSection } from "@/features/landing/components/stats-section";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      description: siteConfig.description,
      jsonLd: [organizationJsonLd()],
      path: "/",
      title: "Mehedi's Math Academy | The Digital Atelier for High-Performance Learning"
    }),
  component: HomePage,
  errorComponent: RouteErrorView
});

function HomePage(): JSX.Element {
  return (
    <LandingLayout>
      <HeroSection />
      <StatsSection />
      <CategoriesSection />
      <CoursesSection />
      <InstructorsSection />
      <CtaSection />
    </LandingLayout>
  );
}
