import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { LandingSection } from "@/features/landing/components/landing-section";
import type { LandingCategory } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { hueForKey, spectrumClasses } from "@/lib/spectrum";

/**
 * The subjects, as the first thing a student can act on.
 *
 * Every edtech site a Bangladeshi student already uses opens with "which subject
 * are you here for" — so this is a row of real categories with real counts, each
 * one a link into the catalogue already filtered.
 */
export function SubjectRailSection({
  categories
}: {
  categories: readonly LandingCategory[];
}): JSX.Element | null {
  const t = useT();
  const format = useFormat();

  if (categories.length === 0) {
    return null;
  }

  return (
    <LandingSection
      action={
        <Link
          className="border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-spectrum-ember hover:text-spectrum-ember"
          to="/categories"
        >
          {t("action.showAll")}
        </Link>
      }
      description={t("home.browseSubjectsLead")}
      eyebrow={t("home.subjectsEyebrow")}
      title={t("home.browseSubjects")}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category, index) => {
          const hue = spectrumClasses(hueForKey(category.slug));

          return (
            <Reveal delayMs={index * 60} key={category.id}>
              <Link
                className={`flex h-full items-center justify-between gap-3 border border-l-2 border-hairline bg-card p-5 transition-colors hover:border-line-strong ${hue.rule}`}
                search={{ categoryId: category.id }}
                to="/courses"
              >
                <span className="min-w-0">
                  <span className={`block text-lg font-medium ${hue.text}`}>{category.name}</span>
                  <span className="mt-1 block text-sm text-muted-light">
                    {format.number(category.courseCount)} {t("common.courses")}
                  </span>
                </span>
                <span aria-hidden="true" className={`shrink-0 text-xl ${hue.text}`}>
                  →
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </LandingSection>
  );
}
