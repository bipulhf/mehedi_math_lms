import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout, PublicSection } from "@/components/layout/public-layout";
import { organizationJsonLd, seo } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { useT } from "@/lib/i18n/locale-context";

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
  const t = useT();

  return (
    <PublicLayout subtitle={t("about.lead")} title={t("about.title")}>
      <PublicSection>
        <div className="max-w-[62ch] space-y-5 text-lg font-light leading-relaxed text-muted">
          <p>{t("about.body1")}</p>
          <p>{t("about.body2")}</p>
        </div>
      </PublicSection>
    </PublicLayout>
  );
}
