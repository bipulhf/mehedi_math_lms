import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { DiamondTrio, DotPatch, QuarterArc, RingedPlay, RingedWord } from "@/components/ui/doodles";
import type { LandingStats } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * The hero: a prominent, bold headline with doodle accents, lead paragraph,
 * high-impact CTA controls, ambient glow, and translucent stat cards.
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
    <section className="relative overflow-hidden border-b border-hairline py-12 sm:py-20 lg:py-28">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/6 blur-[120px]"
      />

      {/* Decorative background doodles */}
      <DotPatch className="-left-4 top-10 opacity-70 animate-float-subtle" />
      <QuarterArc className="right-12 top-14 size-20 opacity-80 animate-float-subtle" />
      <DiamondTrio className="right-1/4 top-1/5 opacity-70" />
      <DotPatch className="-right-6 bottom-16 opacity-60 animate-pulse-subtle" />
      <QuarterArc className="bottom-12 left-1/5 opacity-50" />

      <div className="relative z-10 mx-auto max-w-[90rem] px-4 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center space-y-9">
          {/* Bold Main Headline */}
          <h1 className="animate-fade-up-1 max-w-[22ch] text-4xl font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl lg:text-[4rem]">
            {beforeRing}
            <RingedWord>{t("home.heroTitleRing")}</RingedWord>
            {afterRing}
          </h1>

          {/* Lead Copy */}
          <p className="animate-fade-up-2 max-w-[50ch] text-lg font-light leading-relaxed text-muted sm:text-xl lg:text-[1.375rem]">
            {t("home.heroLead")}
          </p>

          {/* Action CTAs */}
          <div className="animate-fade-up-3 flex flex-wrap items-center justify-center gap-5 pt-2">
            <Button
              asChild
              className="h-12 px-8 text-base transition-all duration-300 hover:scale-[1.04] active:scale-[0.98]"
              size="lg"
            >
              <Link to="/courses">{t("action.viewAllCourses")}</Link>
            </Button>
            <Link
              className="group flex h-12 items-center gap-2.5 rounded-full border border-line-strong bg-card/80 px-6 text-base text-ink shadow-xs backdrop-blur-sm transition-all duration-300 hover:border-accent hover:bg-paper hover:text-accent hover:shadow-md"
              search={{ free: true }}
              to="/courses"
            >
              <RingedPlay className="transition-transform duration-300 group-hover:scale-110" />
              <span>{t("action.watchFreeClass")}</span>
            </Link>
          </div>

          {/* Stat Cards Grid */}
          <dl className="animate-fade-up-4 grid w-full max-w-3xl grid-cols-1 gap-4 pt-10 sm:grid-cols-3">
            {figures.map((figure) => (
              <div
                className="group flex flex-col items-center justify-center rounded-xl border border-hairline bg-card/80 p-6 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:bg-card hover:shadow-md"
                key={figure.label}
              >
                <dd className="text-3xl font-bold tracking-tight text-ink transition-colors group-hover:text-accent sm:text-4xl">
                  {figure.value}
                </dd>
                <dt className="mt-1 text-sm font-medium text-muted-light">{figure.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
