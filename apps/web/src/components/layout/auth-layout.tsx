import { Link } from "@tanstack/react-router";
import type { JSX, PropsWithChildren } from "react";

import { RingedWord, StepCircle } from "@/components/ui/doodles";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { siteConfig } from "@/lib/site";

interface AuthLayoutProps extends PropsWithChildren {
  description: string;
  title: string;
}

/**
 * Sign-in, sign-up, forgot- and reset-password layout: a true split screen,
 * not a card floating on the site's own header/footer chrome. The form pane
 * fills the left column at every width; the right pane — a warm-tinted panel
 * naming what the product actually gives you — only shows up at `lg`.
 *
 * No footer here on purpose: this is meant to read as one focused screen,
 * not a page. The logo doubles as the way back to the rest of the site.
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
    <div className="grid min-h-screen lg:grid-cols-[1fr_28rem]" data-surface="ink">
      {/* Left — the form pane, full height at every width. */}
      <div className="flex min-h-screen flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8 lg:px-14 lg:py-10">
        <div className="flex items-center justify-between">
          <Link aria-label={t("brand.name")} className="flex items-center gap-2.5" to="/">
            <img
              alt={t("brand.name")}
              className="block size-14 object-contain"
              src="/brand/mma-logo.png"
            />
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-lg font-medium text-ink">{t("brand.name")}</span>
              <span className="label-mono text-[10px] tracking-[0.22em] text-accent">
                MATH ACADEMY
              </span>
            </span>
          </Link>
          <Link
            className="border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-accent hover:text-accent"
            to="/"
          >
            {t("auth.backHome")}
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center pb-8 lg:justify-start lg:pt-10">
          <div className="w-full max-w-md lg:max-w-[26rem]">
            <div className="mb-8 space-y-2">
              <h1 className="text-3xl font-medium leading-tight text-ink sm:text-4xl">{title}</h1>
              <p className="text-base font-light leading-relaxed text-muted">{description}</p>
            </div>
            {children}
          </div>
        </div>
      </div>

      {/* Right — warm-tinted showcase panel, lg and up only. One centred
          composition, not two blocks pinned to opposite edges with a void
          between them. */}
      <div
        className="relative hidden overflow-hidden border-l border-hairline lg:flex lg:flex-col lg:justify-center lg:gap-14 lg:p-12"
        style={{
          background:
            "linear-gradient(165deg, rgba(255,165,0,.16), rgba(255,242,0,.07) 48%, rgba(0,207,255,.12))"
        }}
      >
        <img
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-14 size-72 object-contain opacity-10"
          src="/brand/mma-logo.png"
        />

        <div className="relative space-y-5">
          <span className="label-mono inline-flex self-start rounded-[var(--radius-pill)] border border-hairline bg-background/35 px-4 py-2 text-xs uppercase tracking-[0.14em] text-ink-muted">
            {t("auth.panelEyebrow")}
          </span>
          <h2 className="max-w-[20ch] text-3xl font-medium leading-tight tracking-tight text-ink">
            {beforeRing}
            <RingedWord>{t("auth.heroTitleRing")}</RingedWord>
            {afterRing}
          </h2>
        </div>

        <div className="relative space-y-6">
          {features.map((feature) => (
            <div className="flex gap-4" key={feature.number}>
              <StepCircle>{feature.number}</StepCircle>
              <div className="space-y-1">
                <h3 className="text-base font-medium text-ink">{feature.title}</h3>
                <p className="max-w-[34ch] text-sm font-light leading-relaxed text-muted">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}

          <p className="text-sm font-light text-muted">
            {t("nav.helpline")}:{" "}
            <a
              className="text-ink transition-colors hover:text-accent"
              href={`tel:${siteConfig.contact.helpline}`}
            >
              {format.digits(siteConfig.contact.helpline)}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
