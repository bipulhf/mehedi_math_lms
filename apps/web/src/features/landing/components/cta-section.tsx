import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { DotPatch } from "@/components/ui/doodles";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { siteConfig } from "@/lib/site";

/**
 * The closing band on `panel-warm`: one line, one Ink action, one underlined
 * link, and a dot patch behind. No accent fill — DESIGN.md §1 keeps the accent
 * off large marketing surfaces.
 *
 * The strip underneath answers the two questions that stop a Bangladeshi
 * purchase — how do I pay, and who do I call. Every paid platform researched in
 * `docs/landing-bd-edtech-patterns.md` (§1, §13) answers both before the footer.
 */
export function CtaSection(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { isPending, session } = useAuthSession();

  return (
    <section className="relative overflow-hidden bg-panel-warm">
      <DotPatch className="-left-4 bottom-4 transition-transform duration-700 hover:scale-110" />
      <DotPatch className="-right-4 top-4 transition-transform duration-700 hover:scale-110" />
      <Reveal className="mx-auto flex w-full max-w-[90rem] flex-col items-start gap-6 px-4 pb-10 pt-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:pt-20">
        <div className="space-y-3">
          <h2
            className="max-w-[16ch] font-medium leading-[1.05] tracking-tight text-ink"
            style={{ fontSize: "var(--text-display)" }}
          >
            {t("home.closingTitle")}
          </h2>
          <p className="max-w-[52ch] text-base font-light leading-relaxed text-muted">
            {t("home.closingLead")}
          </p>
        </div>

        {/* `shrink-0` and no wrap on the link: the group is sized to its
            content, and at 1440 the button plus the link came out a pixel over,
            which dropped the link onto a second line beneath the button. */}
        {isPending ? null : (
          <div className="flex shrink-0 flex-wrap items-center gap-6">
            <Button asChild size="lg">
              <Link to={session ? "/dashboard" : "/auth/sign-up"}>
                {session ? t("nav.dashboard") : t("home.openAccount")}
              </Link>
            </Button>
            <Link
              className="group flex items-center gap-1.5 whitespace-nowrap border-b border-line-strong pb-0.5 text-base text-ink transition-colors duration-200 hover:border-spectrum-ember hover:text-spectrum-ember"
              to="/contact"
            >
              <span>{t("footer.support")}</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        )}
      </Reveal>

      <div className="mx-auto w-full max-w-[90rem] px-4 pb-14 sm:px-8 lg:px-14">
        <div className="flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            <span className="text-muted-faint">{t("home.payWith")}:</span>{" "}
            {t("home.payMethods")}
          </p>
          <p className="text-sm text-muted">
            <span className="text-muted-faint">{t("nav.helpline")}:</span>{" "}
            <a className="label-mono text-ink" href={`tel:${siteConfig.contact.helpline}`}>
              {format.digits(siteConfig.contact.helpline)}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
