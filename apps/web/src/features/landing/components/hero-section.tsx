import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { CountUp } from "@/components/marketing/count-up";
import { Marquee } from "@/components/marketing/marquee";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/ui/button";
import { RingedPlay, RingedWord } from "@/components/ui/doodles";
import type { LandingCategory, LandingStats } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { hueForKey, spectrumClasses } from "@/lib/spectrum";

/**
 * The opening: a short headline, the numbers behind it, and the subjects
 * drifting past on a thin band. Nothing else — the catalogue is the section
 * directly below, which is what a student came for.
 *
 * Marketing pages carry motion the app shell does not (ADR-0012): the headline
 * and its supporting lines rise in sequence, the counts run once, and the
 * subject band drifts. All of it stops under prefers-reduced-motion, where this
 * is a headline over a row of words.
 */
export function HeroSection({
  categories,
  stats
}: {
  categories: readonly LandingCategory[];
  stats: LandingStats;
}): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [beforeRing = "", afterRing = ""] = t("home.heroTitle").split("{ring}");

  const figures = [
    { label: t("home.statStudents"), value: stats.students },
    { label: t("home.statTeachers"), value: stats.teachers },
    { label: t("home.statCourses"), value: stats.publishedCourses }
  ].filter((figure) => figure.value > 0);

  return (
    <section className="relative overflow-hidden border-b border-hairline">
      {/* Deliberately short: the courses are what a student came for, so the
          hero says who this is and gets out of the way. */}
      <div className="mx-auto max-w-[90rem] px-4 pb-6 pt-10 sm:px-8 lg:px-14 lg:pb-8 lg:pt-14">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Reveal
              as="p"
              className="label-mono text-xs uppercase tracking-[0.28em] text-spectrum-ember"
            >
              {t("home.subjectsEyebrow")}
            </Reveal>

            <Reveal delayMs={80}>
              <h1
                className="mt-4 max-w-[18ch] font-medium leading-[1.02] tracking-[-0.02em] text-ink"
                style={{ fontSize: "var(--text-display)" }}
              >
                {beforeRing}
                <RingedWord>{t("home.heroTitleRing")}</RingedWord>
                {afterRing}
              </h1>
            </Reveal>

            <Reveal
              as="p"
              className="mt-5 max-w-[46ch] text-base font-light leading-relaxed text-muted sm:text-lg"
              delayMs={160}
            >
              {t("home.heroLead")}
            </Reveal>

            <Reveal className="mt-6 flex flex-wrap items-center gap-3" delayMs={240}>
              <Button asChild className="h-11 px-7 text-base" size="lg">
                <Link to="/courses">{t("action.viewAllCourses")}</Link>
              </Button>
              <Link
                className="group flex h-11 items-center gap-2.5 rounded-full border border-line-strong px-5 text-base text-ink transition-colors hover:border-spectrum-ember hover:text-spectrum-ember"
                search={{ free: true }}
                to="/courses"
              >
                <RingedPlay />
                <span>{t("action.watchFreeClass")}</span>
              </Link>
            </Reveal>
          </div>

          {figures.length === 0 ? null : (
            <Reveal className="grid grid-cols-3 gap-4 border-t border-hairline pt-5" delayMs={320}>
              {figures.map((figure, index) => {
                const hue = spectrumClasses(hueForKey(figure.label));

                return (
                  <div className={`border-l-2 pl-4 ${hue.rule}`} key={figure.label}>
                    <p className="text-2xl font-medium tracking-tight text-ink sm:text-3xl">
                      <CountUp durationMs={900 + index * 150} value={figure.value} />
                    </p>
                    <p className="mt-1 text-sm text-muted-light">{figure.label}</p>
                  </div>
                );
              })}
            </Reveal>
          )}
        </div>
      </div>

      {categories.length === 0 ? null : (
        <div className="border-t border-hairline bg-panel-warm py-2.5">
          <Marquee
            items={categories.map((category) => (
              <span
                className={`text-lg font-medium tracking-tight sm:text-xl ${spectrumClasses(hueForKey(category.slug)).text}`}
                key={category.id}
              >
                {category.name}
                <span className="ml-2 align-super text-sm text-muted-faint">
                  {format.number(category.courseCount)}
                </span>
              </span>
            ))}
          />
        </div>
      )}
    </section>
  );
}
