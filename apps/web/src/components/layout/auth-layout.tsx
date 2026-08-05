import { Link } from "@tanstack/react-router";
import type { JSX, PropsWithChildren } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { DiamondTrio, DotPatch, QuarterArc, RingedWord, StepCircle } from "@/components/ui/doodles";
import { useT } from "@/lib/i18n/locale-context";
import { siteConfig } from "@/lib/site";

interface AuthLayoutProps extends PropsWithChildren {
  description: string;
  title: string;
}

/**
 * Sign-in and sign-up layout. Feature showcase on desktop, crisp form card,
 * warm paper background, hairline rules, doodles, full i18n support, and site footer.
 */
export function AuthLayout({ children, description, title }: AuthLayoutProps): JSX.Element {
  const t = useT();
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-paper">
      {/* Background Doodles */}
      <DotPatch className="-left-4 top-24 hidden opacity-60 lg:block" />
      <QuarterArc className="bottom-20 right-24 hidden opacity-70 lg:block" />
      <DiamondTrio className="left-1/3 top-16 hidden opacity-60 lg:block" />

      {/* Header Bar */}
      <header className="mx-auto flex w-full max-w-[90rem] items-center justify-between px-4 py-6 sm:px-8 lg:px-14">
        <Link aria-label={siteConfig.name} className="flex items-center gap-2.5" to="/">
          <img alt="" className="block h-7 w-auto" src="/brand/genex-mark.png" />
          <img alt={siteConfig.name} className="block h-4 w-auto" src="/brand/genex-wordmark.png" />
        </Link>
        <Link
          className="border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-accent hover:text-accent"
          to="/"
        >
          {t("auth.backHome")}
        </Link>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-[90rem] flex-1 items-center px-4 py-8 sm:px-8 lg:px-14 lg:py-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1fr_450px] lg:gap-16">
          {/* Left Column - Brand & Value Showcase (Visible on Large Screens) */}
          <div className="hidden space-y-8 lg:block">
            {/* Hero Title */}
            <h2 className="text-3xl font-medium leading-tight tracking-tight text-ink lg:text-4xl">
              {beforeRing}
              <RingedWord>{t("auth.heroTitleRing")}</RingedWord>
              {afterRing}
            </h2>

            {/* Feature List */}
            <div className="space-y-6 pt-2">
              {features.map((feature) => (
                <div className="flex gap-4" key={feature.number}>
                  <StepCircle>{feature.number}</StepCircle>
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium text-ink">{feature.title}</h3>
                    <p className="max-w-[42ch] text-base font-light leading-relaxed text-muted">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Auth Form Card */}
          <div className="mx-auto w-full max-w-[28rem] lg:mx-0 lg:max-w-none">
            {/* `p-8` at 360px leaves the form 264px of usable width. The step
                down to `p-6` there gives a phone back two thumb-widths. */}
            <div className="border border-hairline bg-card p-6 sm:p-8 lg:p-10">
              <div className="mb-8 space-y-2">
                <h1 className="text-2xl font-medium leading-tight text-ink sm:text-3xl">{title}</h1>
                <p className="text-base font-light leading-relaxed text-muted">{description}</p>
              </div>
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
