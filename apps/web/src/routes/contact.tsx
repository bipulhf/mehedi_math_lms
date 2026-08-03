import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { organizationJsonLd, seo } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { useT } from "@/lib/i18n/locale-context";

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
  const t = useT();

  return (
    <PublicLayout
      eyebrow="Reach the team"
      title={t("contact.lead")}
      subtitle="Use the dashboard bug reporter for product issues, or email hello@genex.com.bd for general inquiries while dedicated in-app messaging rolls out."
    >
      <Card className="bg-panel-warm">
        <CardContent className="space-y-3 p-6 text-sm leading-7 text-ink/80">
          <p>
            <span className="font-semibold text-ink">{t("contact.email")}</span> hello@genex.com.bd
          </p>
          <p>
            <span className="font-semibold text-ink">{t("contact.site")}</span> {siteConfig.url}
          </p>
        </CardContent>
      </Card>
    </PublicLayout>
  );
}
