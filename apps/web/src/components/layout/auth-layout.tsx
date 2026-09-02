import { Link } from "@tanstack/react-router";
import type { JSX, PropsWithChildren } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { DiamondTrio, DotPatch, FaintFormula, QuarterArc, RingedWord, StepCircle } from "@/components/ui/doodles";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { siteConfig } from "@/lib/site";

interface AuthLayoutProps extends PropsWithChildren {
  description: string;
  title: string;
}

/**
 * Sign-in, sign-up, forgot- and reset-password layout.
 *
 * The real `SiteHeader` sits on top — full nav, language switch, session
 * state — same as every other page. Below it, one bounded card, capped and
 * centred, rather than a full-bleed split screen: a fixed-width pane against
 * a fluid one breaks the moment the viewport isn't the one width it was
 * designed at (it did, twice). Capping the whole composition together means
 * there's no width where the two halves can drift out of proportion.
 */
export function AuthLayout({ children, description, title }: AuthLayoutProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [beforeRing = "", afterRing = ""] = t("auth.heroTitle").split("{ring}");

  const features = [
    {
      description: t("auth.feature1Desc"),
      number: "01",
      title: t("auth.feature1Title")
    },
    {
      description: t("auth.feature2Desc"),
      number: "02",
      title: t("auth.feature2Title")
    },
    {
      description: t("auth.feature3Desc"),
      number: "03",
      title: t("auth.feature3Title")
    }
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-40 size-[32rem] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-brand-blue) 14%, transparent), transparent 70%)"
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 bottom-0 size-[32rem] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-brand-orange) 12%, transparent), transparent 70%)"
          }}
        />

        <DotPatch className="left-10 top-10 hidden opacity-60 lg:block" />
        <QuarterArc className="bottom-14 right-16 hidden opacity-70 lg:block" />
        <DiamondTrio className="right-24 top-16 hidden opacity-60 lg:flex" />
        <FaintFormula className="-bottom-8 left-16 hidden lg:block" glyph="π" rotate={-8} />
        <FaintFormula className="-top-6 right-1/3 hidden lg:block" glyph="∞" rotate={10} />

        <Link
          className="relative border-b border-line-strong pb-0.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
          to="/"
        >
          {t("auth.backHome")}
        </Link>

        <div className="relative w-full max-w-4xl overflow-hidden rounded-[var(--radius-md)] border border-hairline lg:grid lg:grid-cols-2">
          {/* Showcase — lg and up only. */}
          <div
            className="relative hidden flex-col justify-center gap-9 p-10 lg:flex"
            style={{
              background:
                "linear-gradient(165deg, color-mix(in oklab, var(--color-brand-orange) 16%, transparent), color-mix(in oklab, var(--color-brand-orange) 7%, transparent) 48%, color-mix(in oklab, var(--color-brand-blue) 14%, transparent))"
            }}
          >
            <img
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-12 size-56 object-contain opacity-10"
              src="/brand/mma-logo.png"
            />

            <div className="relative space-y-4">
              <span className="label-mono inline-flex self-start rounded-[var(--radius-pill)] border border-hairline bg-card/70 px-3.5 py-1.5 text-xs uppercase tracking-[0.14em] text-ink-muted">
                {t("auth.panelEyebrow")}
              </span>
              <h2 className="max-w-[18ch] text-2xl font-medium leading-tight tracking-tight text-ink">
                {beforeRing}
                <RingedWord>{t("auth.heroTitleRing")}</RingedWord>
                {afterRing}
              </h2>
            </div>

            <div className="relative space-y-5">
              {features.map((feature) => (
                <div className="flex gap-3.5" key={feature.number}>
                  <StepCircle className="size-9 text-xs">{feature.number}</StepCircle>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium text-ink">{feature.title}</h3>
                    <p className="max-w-[30ch] text-sm font-light leading-relaxed text-muted">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="relative text-sm font-light text-muted">
              {t("nav.helpline")}:{" "}
              <a
                className="text-ink transition-colors hover:text-accent"
                href={`tel:${siteConfig.contact.helpline}`}
              >
                {format.digits(siteConfig.contact.helpline)}
              </a>
            </p>
          </div>

          {/* Form */}
          <div className="bg-card p-6 sm:p-8 lg:p-10">
            <div className="mb-7 space-y-2">
              <h1 className="text-2xl font-medium leading-tight text-ink sm:text-3xl">{title}</h1>
              <p className="text-base font-light leading-relaxed text-muted">{description}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
