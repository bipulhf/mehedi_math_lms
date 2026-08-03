import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";

import { LanguageSwitcher } from "@/components/common/language-switcher";
import { siteNavItems } from "@/components/layout/site-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The 82px marketing header. Translucent paper so the page texture shows
 * through, one hairline underneath, and no shadow. DESIGN.md §3, §5.
 *
 * Below `lg` the nav and the helpline move into a drawer rather than wrapping —
 * the design's 1440px row does not fold, and a header that grows to three rows
 * on a phone stops being a header.
 */
export function SiteHeader(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const format = useFormat();
  const { isPending, session } = useAuthSession();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [router.state.location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/78">
      <div className="mx-auto flex h-20 w-full max-w-[90rem] items-center justify-between gap-6 px-4 sm:px-8 lg:h-[82px] lg:px-14">
        <div className="flex items-center gap-10">
          <Link aria-label={siteConfig.name} className="flex items-center gap-2.5" to="/">
            <img alt="" className="block h-7 w-auto" src="/brand/genex-mark.png" />
            <img
              alt={siteConfig.name}
              className="block h-4 w-auto"
              src="/brand/genex-wordmark.png"
            />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {siteNavItems.map((item) => (
              <Link
                activeProps={{ className: "text-ink" }}
                className="text-base text-muted transition-colors hover:text-ink"
                key={item.labelKey}
                search={item.search}
                to={item.to}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden flex-col leading-tight xl:flex">
            <span className="label-mono text-[11px] text-muted-faint">{t("nav.helpline")}</span>
            <a className="text-base text-ink" href={`tel:${siteConfig.contact.helpline}`}>
              {format.digits(siteConfig.contact.helpline)}
            </a>
          </div>

          <LanguageSwitcher className="hidden md:inline-flex" />

          {isPending ? (
            <div className="hidden items-center gap-4 sm:flex">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-9 w-20" />
            </div>
          ) : session ? (
            <Button asChild size="sm">
              <Link to="/dashboard">{t("nav.dashboard")}</Link>
            </Button>
          ) : (
            <>
              <Link
                className="hidden text-base text-muted transition-colors hover:text-ink sm:block"
                to="/auth/sign-in"
              >
                {t("nav.login")}
              </Link>
              <Button asChild className="hidden sm:inline-flex" size="sm">
                <Link to="/auth/sign-up">{t("nav.enroll")}</Link>
              </Button>
            </>
          )}

          <button
            aria-expanded={isDrawerOpen}
            aria-label={t("nav.menu")}
            className="inline-flex size-11 items-center justify-center border border-hairline text-ink lg:hidden"
            onClick={() => setIsDrawerOpen((open) => !open)}
            type="button"
          >
            {/* Text marks, not an icon — the design ships no icon font. */}
            <span aria-hidden="true" className="text-lg leading-none">
              {isDrawerOpen ? "×" : "≡"}
            </span>
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-hairline bg-paper lg:hidden",
          isDrawerOpen ? "block" : "hidden"
        )}
      >
        <nav className="mx-auto flex w-full max-w-[90rem] flex-col px-4 py-2 sm:px-8">
          {siteNavItems.map((item) => (
            <Link
              activeProps={{ className: "text-ink" }}
              className="flex min-h-11 items-center border-b border-hairline-faint text-base text-muted last:border-b-0"
              key={item.labelKey}
              search={item.search}
              to={item.to}
            >
              {t(item.labelKey)}
            </Link>
          ))}
          {isPending ? (
            <div className="flex items-center gap-4 py-4 sm:hidden">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-9 w-20" />
            </div>
          ) : session ? null : (
            <div className="flex flex-wrap items-center gap-4 py-4 sm:hidden">
              <Link className="text-base text-muted" to="/auth/sign-in">
                {t("nav.login")}
              </Link>
              <Button asChild size="sm">
                <Link to="/auth/sign-up">{t("nav.enroll")}</Link>
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 py-3 md:hidden">
            <a className="text-base text-ink" href={`tel:${siteConfig.contact.helpline}`}>
              {format.digits(siteConfig.contact.helpline)}
            </a>
            <LanguageSwitcher />
          </div>
        </nav>
      </div>
    </header>
  );
}
