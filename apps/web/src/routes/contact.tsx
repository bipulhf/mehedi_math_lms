import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout, PublicSection } from "@/components/layout/public-layout";
import { organizationJsonLd, seo } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { useFormat, useT } from "@/lib/i18n/locale-context";

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
  const format = useFormat();

  return (
    <PublicLayout subtitle={t("contact.lead")} title={t("contact.title")}>
      <PublicSection className="space-y-8">
        {/* Straight from siteConfig — the page used to carry its own address
            and a different mailbox from the footer's. */}
        <dl className="max-w-[62ch] space-y-4 text-lg font-light text-muted">
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted-light">{t("contact.helpline")}</dt>
            <dd className="text-ink">
              <a href={`tel:${siteConfig.contact.helpline}`}>
                {format.digits(siteConfig.contact.helpline)}
              </a>
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted-light">{t("contact.email")}</dt>
            <dd className="text-ink">
              <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted-light">{t("contact.address")}</dt>
            <dd className="text-ink">{siteConfig.contact.address}</dd>
          </div>
        </dl>

        <p className="max-w-[62ch] border border-dashed border-dot-idle p-5 text-base font-light leading-relaxed text-muted">
          {t("contact.bugNote")}
        </p>
      </PublicSection>
    </PublicLayout>
  );
}
