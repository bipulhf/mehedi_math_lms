import { createFileRoute } from "@tanstack/react-router";
import { useState, type JSX } from "react";

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
      <PublicSection>
        <div className="grid max-w-4xl gap-8 md:grid-cols-[280px_1fr] md:items-center md:gap-14">
          <FounderPortrait alt={t("about.founderAlt")} name={t("about.founderName")} />
          <div className="space-y-3">
            <p className="label-mono text-xs uppercase text-muted-faint">
              {t("about.founderEyebrow")}
            </p>
            <h2 className="text-2xl font-medium text-ink">{t("about.founderName")}</h2>
            <p className="max-w-[52ch] text-lg font-light leading-relaxed text-muted">
              {t("about.founderBody")}
            </p>
          </div>
        </div>
      </PublicSection>
    </PublicLayout>
  );
}

/**
 * Founder portrait with a clear fallback: if the image fails to load, the
 * initials panel shows in its place, so the about page never has a broken
 * square where the portrait should be.
 */
function FounderPortrait({ alt, name }: { alt: string; name: string }): JSX.Element {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        aria-label={alt}
        className="flex aspect-square w-full items-center justify-center border border-hairline bg-card text-3xl font-medium text-ink"
        role="img"
      >
        {initialsFor(name)}
      </div>
    );
  }

  return (
    <div className="border border-hairline bg-card p-2">
      <img
        alt={alt}
        className="aspect-square w-full object-cover"
        decoding="async"
        loading="lazy"
        onError={() => setHasError(true)}
        src="/brand/mehedi-bhai.jpeg"
      />
    </div>
  );
}

/**
 * Two-letter initials for the fallback panel. Handles Latin and Bangla names
 * the same way: take the first codepoint, capitalise if it is a Latin letter.
 */
function initialsFor(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return "?";
  }

  // Split on whitespace so "Mehedi Hasan" becomes "MH", "মেহেদী হাসান" likewise.
  const parts = trimmed.split(/\s+/u).filter((part) => part.length > 0);

  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }

  return parts[0]!.charAt(0).toUpperCase();
}