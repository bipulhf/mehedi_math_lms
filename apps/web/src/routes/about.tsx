import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { organizationJsonLd, seo } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () =>
    seo({
      description: `${siteConfig.name} pairs editorial surfaces with disciplined mathematics instruction for students across Bangladesh and beyond.`,
      jsonLd: [organizationJsonLd()],
      path: "/about",
      title: "About"
    }),
  component: AboutPage,
  errorComponent: RouteErrorView
});

function AboutPage(): JSX.Element {
  return (
    <PublicLayout
      eyebrow="Our story"
      title="A digital atelier for serious mathematics learners."
      subtitle="We combine the Digital Atelier design language with structured programs, assessments, and human instructors who stay close to every cohort."
    >
      <Card className="bg-surface-container-low">
        <CardContent className="space-y-4 p-6 text-sm leading-7 text-on-surface/80">
          <p>
            {siteConfig.name} exists to remove friction between curiosity and disciplined practice. Courses are authored with
            editorial rigor—layered surfaces, calm motion, and typography that keeps attention on the problem at hand.
          </p>
          <p>
            Behind every published course sits a teaching team, an accountant-ready commerce layer, and tooling for bug reports,
            messaging, and SMS notices so operations stay as thoughtful as the curriculum.
          </p>
        </CardContent>
      </Card>
    </PublicLayout>
  );
}
