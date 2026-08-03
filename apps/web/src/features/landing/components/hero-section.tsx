import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { DotPatch, QuarterArc, RingedWord } from "@/components/ui/doodles";
import type { LandingStats } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * The hero: a large headline with the ring doodle around one word, a lead
 * paragraph, an Ink action beside an underlined one, and a stat row above a
 * hairline.
 *
 * The design hardcodes which word is ringed. Here the sentence carries a
 * `{ring}` placeholder instead, because the ringed word differs between Bangla
 * and English and hardcoding it would circle the wrong one.
 *
 * Three figures, not the design's four — "৬ পরীক্ষা কেন্দ্র" has nothing behind
 * it. GENEX_MIGRATION.md §2.
 */
export function HeroSection({ stats }: { stats: LandingStats }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [beforeRing = "", afterRing = ""] = t("home.heroTitle").split("{ring}");

  const figures: readonly { label: string; value: string }[] = [
    { label: t("common.students"), value: format.number(stats.students) },
    { label: t("common.teachers"), value: format.number(stats.teachers) },
    { label: t("common.courses"), value: format.number(stats.publishedCourses) }
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-[90rem] gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_420px] lg:items-center lg:px-14 lg:py-24">
        <div className="space-y-7">
          <h1 className="max-w-[20ch] text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl lg:text-[3.375rem]">
            {beforeRing}
            <RingedWord>{t("home.heroTitleRing")}</RingedWord>
            {afterRing}
          </h1>

          <p className="max-w-[48ch] text-lg font-light leading-relaxed text-muted lg:text-xl">
            {t("home.heroLead")}
          </p>

          <div className="flex flex-wrap items-center gap-6">
            <Button asChild size="lg">
              <Link to="/courses">{t("action.viewAllCourses")}</Link>
            </Button>
            <Link
              className="border-b border-line-strong pb-0.5 text-lg text-ink transition-colors duration-150 hover:border-accent hover:text-accent"
              search={{ free: true }}
              to="/courses"
            >
              {t("action.watchFreeClass")}
            </Link>
          </div>

          <dl className="flex flex-wrap gap-x-11 gap-y-6 border-t border-hairline pt-8">
            {figures.map((figure) => (
              <div key={figure.label}>
                <dd className="text-2xl font-medium text-ink sm:text-3xl">{figure.value}</dd>
                <dt className="text-base font-light text-muted-light">{figure.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* The design puts a photograph here. Until there is one, this is the
            placeholder fill the design specifies for every missing image —
            better than an illustration in the wrong palette. */}
        <div className="relative hidden aspect-4/5 items-center justify-center bg-placeholder-fill lg:flex">
          <DotPatch className="-bottom-4 -left-4" />
          <QuarterArc className="-right-6 -top-6" />
        </div>
      </div>
    </section>
  );
}
