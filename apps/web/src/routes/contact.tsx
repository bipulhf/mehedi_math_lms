import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { organizationJsonLd, seo } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () =>
    seo({
      description: `Contact ${siteConfig.name} for enrollment questions, partnerships, or institutional collaborations.`,
      jsonLd: [organizationJsonLd()],
      path: "/contact",
      title: "Contact"
    }),
  component: ContactPage,
  errorComponent: RouteErrorView
});

function ContactPage(): JSX.Element {
  return (
    <PublicLayout
      eyebrow="Reach the team"
      title="We read every note from students, guardians, and school partners."
      subtitle="Use the dashboard bug reporter for product issues, or email hello@mehedismathacademy.com for general inquiries while dedicated in-app messaging rolls out."
    >
      <Card className="bg-surface-container-low">
        <CardContent className="space-y-3 p-6 text-sm leading-7 text-on-surface/80">
          <p>
            <span className="font-semibold text-on-surface">Email:</span> hello@mehedismathacademy.com
          </p>
          <p>
            <span className="font-semibold text-on-surface">Site:</span> {siteConfig.url}
          </p>
        </CardContent>
      </Card>
    </PublicLayout>
  );
}
