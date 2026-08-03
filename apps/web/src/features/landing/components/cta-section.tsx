import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { DotPatch } from "@/components/ui/doodles";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The closing band on `panel-warm`: one line, one Ink action, one underlined
 * link, and a dot patch behind. No accent fill — DESIGN.md §1 keeps the accent
 * off large marketing surfaces.
 */
export function CtaSection(): JSX.Element {
  const t = useT();
  const { isPending, session } = useAuthSession();

  return (
    <section className="relative overflow-hidden bg-panel-warm">
      <DotPatch className="-left-4 bottom-4 transition-transform duration-700 hover:scale-110" />
      <DotPatch className="-right-4 top-4 transition-transform duration-700 hover:scale-110" />
      <div className="animate-fade-in mx-auto flex w-full max-w-[90rem] flex-col items-start gap-6 px-4 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-20">
        <div className="space-y-3">
          <h2 className="max-w-[20ch] text-2xl font-medium leading-tight text-ink sm:text-3xl">
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
            <Button asChild className="shadow-xs transition-transform duration-300 hover:scale-[1.04] active:scale-[0.98]" size="lg">
              <Link to={session ? "/dashboard" : "/auth/sign-up"}>
                {session ? t("nav.dashboard") : t("home.openAccount")}
              </Link>
            </Button>
            <Link
              className="group flex items-center gap-1.5 whitespace-nowrap border-b border-line-strong pb-0.5 text-base text-ink transition-colors duration-200 hover:border-accent hover:text-accent"
              to="/contact"
            >
              <span>{t("footer.support")}</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
