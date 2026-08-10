import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/ui/button";
import { DiamondTrio, DotPatch, RingedPlay, RingedWord } from "@/components/ui/doodles";
import { PriceText } from "@/components/ui/price-text";
import { RatingStars } from "@/components/ui/rating-stars";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import type { LandingCourse } from "@/lib/api/landing";
import { renderMathToHtml } from "@/lib/katex";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { siteConfig } from "@/lib/site";

interface HeroSectionProps {
  readonly spotlightCourse: LandingCourse | undefined;
}

/**
 * A big, faded display formula sitting behind the headline — the same
 * identity move as `FaintFormula`, but real typeset maths (via KaTeX) rather
 * than a single glyph, so it fills the space beside a short headline with
 * something that belongs to a maths academy rather than empty ink.
 */
function BackgroundFormula({
  className,
  hue,
  latex
}: {
  className?: string;
  hue: "cyan" | "orange" | "yellow";
  latex: string;
}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`formula-display pointer-events-none absolute select-none text-[3.2rem] opacity-[0.14] sm:text-[4.5rem] lg:text-[5.5rem] formula-hue-${hue} ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: renderMathToHtml(latex, true) }}
    />
  );
}

/**
 * A soft, blurred colour wash — DESIGN.md §2 sanctions gradients for exactly
 * this: atmospheric depth, never a literal panel. Two of these are the whole
 * budget for the section; more would turn "night classroom" into a rave.
 */
function GlowWash({ className, tint }: { className?: string; tint: string }): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl ${className ?? ""}`}
      style={{ background: `radial-gradient(circle, ${tint}, transparent 70%)` }}
    />
  );
}

/**
 * The opening band: headline and, when the admin has a featured course, a
 * compact spotlight of it.
 *
 * Reintroduced at the owner's request after the catalogue-first layout
 * (`docs/landing-bd-edtech-patterns.md`) shipped without one. The spotlight
 * card's numbers come from the landing snapshot; there is no struck-through
 * price or "seats left" urgency because nothing in the schema backs either.
 */
export function HeroSection({ spotlightCourse }: HeroSectionProps): JSX.Element {
  const t = useT();

  return (
    <section className="relative overflow-hidden border-b border-hairline">
      <GlowWash className="-left-32 top-1/2 size-[34rem] -translate-y-1/2" tint="rgba(0,207,255,0.16)" />
      <GlowWash className="-right-40 top-16 size-[30rem]" tint="rgba(255,165,0,0.14)" />

      <BackgroundFormula
        className="-bottom-6 left-4 hidden -rotate-3 sm:block lg:left-[6%]"
        hue="yellow"
        latex="x = \frac{-b \pm \sqrt{b^{2}-4ac}}{2a}"
      />

      <DotPatch className="right-6 top-8 lg:right-[27rem]" />
      <DiamondTrio className="right-10 top-28 hidden lg:flex lg:right-[29rem]" />

      <div className="relative mx-auto grid w-full max-w-[90rem] gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_26rem] lg:items-center lg:px-14 lg:py-28">
        <Reveal>
          <div className="space-y-7">
            <p className="flex items-center gap-2.5 label-mono text-xs uppercase tracking-[0.2em] text-accent">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent animate-doodle-pulse"
              />
              {t("home.heroEyebrow")}
            </p>

            <h1
              className="max-w-[16ch] font-bold leading-[1.04] tracking-tight text-ink"
              style={{ fontSize: "var(--text-display-lg)" }}
            >
              {t("home.heroTitleBefore")}{" "}
              <RingedWord>
                <span className="text-brand-orange">{t("home.heroTitleRinged")}</span>
              </RingedWord>{" "}
              {t("home.heroTitleAfter")}
            </h1>

            <p className="max-w-[46ch] text-lg font-light leading-relaxed text-muted">
              {siteConfig.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Button asChild size="lg" variant="accent">
                <Link to="/courses">{t("home.heroCtaPrimary")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link search={{ free: true }} to="/courses">
                  {t("home.heroCtaSecondary")}
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>

        {spotlightCourse ? (
          <Reveal delayMs={120}>
            <SpotlightCard course={spotlightCourse} />
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

function SpotlightCard({ course }: { course: LandingCourse }): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-hairline bg-panel-warm">
      {course.coverImageUrl ? (
        <div className="relative h-40 w-full bg-placeholder-fill">
          <ResponsiveImage
            alt=""
            className="size-full object-cover"
            sizes="416px"
            src={course.coverImageUrl}
          />
        </div>
      ) : null}

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label-mono text-xs uppercase tracking-[0.14em] text-accent">
            {t("home.heroSpotlightEyebrow")}
          </span>
          <span className="rounded-[var(--radius-pill)] border border-hairline px-3 py-1 text-xs text-muted">
            {course.category.name}
          </span>
        </div>

        <Link
          className="block text-xl font-medium leading-snug text-ink transition-colors hover:text-accent"
          params={{ slug: course.slug }}
          to="/courses/$slug"
        >
          {course.title}
        </Link>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
          {course.teacher ? <span>{course.teacher.name}</span> : null}
          <span>{t("course.lessons", { count: format.number(course.lectureCount) })}</span>
        </div>

        {course.freeLectureCount > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <RingedPlay className="border-accent" glyphClassName="bg-accent" />
            {t("course.freeLessons", { count: format.number(course.freeLectureCount) })}
          </div>
        ) : null}

        {course.rating ? (
          <div className="flex items-center gap-2">
            <RatingStars rating={course.rating.average} />
            <span className="label-mono text-xs text-muted-faint">
              {format.number(course.rating.count)}
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-t border-hairline pt-4">
          <PriceText amount={course.price} className="text-2xl font-medium" />
          <Button asChild variant="accent">
            <Link params={{ slug: course.slug }} to="/courses/$slug">
              {t("course.enroll")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
