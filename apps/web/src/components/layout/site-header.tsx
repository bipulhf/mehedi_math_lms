import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";

import { LanguageSwitcher } from "@/components/common/language-switcher";
import { isSiteNavItemActive, siteNavItems, type SiteNavItem } from "@/components/layout/site-nav";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Three ink bars, crossed when the drawer is open. Drawn, not typed: the glyphs
 * `≡` and `×` sit on different baselines and at different optical weights, so
 * the button appeared to twitch between states. Rotation here is a static
 * transform, not an animation — DESIGN.md §1 still holds.
 */
function MenuGlyph({ isOpen }: { isOpen: boolean }): JSX.Element {
  const bar = "absolute h-px w-4 bg-ink";

  return (
    <span aria-hidden="true" className="relative block size-4">
      {isOpen ? (
        <>
          <span className={cn(bar, "top-1/2 rotate-45")} />
          <span className={cn(bar, "top-1/2 -rotate-45")} />
        </>
      ) : (
        <>
          <span className={cn(bar, "top-[3px]")} />
          <span className={cn(bar, "top-1/2")} />
          <span className={cn(bar, "top-[13px]")} />
        </>
      )}
    </span>
  );
}

/** Below this the page is still "at the top" and the header always shows. */
const REVEAL_ZONE_PX = 96;
/** Ignore the pixel-level jitter a trackpad and iOS rubber-banding produce. */
const SCROLL_EPSILON_PX = 6;

/**
 * True while the reader is scrolling down, away from the top of the page.
 *
 * Scroll direction is read off `window.scrollY` inside a rAF so a fast flick
 * produces one state change per frame rather than one per scroll event.
 */
function useIsScrollingDown(): boolean {
  const [isScrollingDown, setIsScrollingDown] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = (): void => {
      frame = 0;

      const currentY = window.scrollY;
      const delta = currentY - lastY;

      if (Math.abs(delta) < SCROLL_EPSILON_PX) {
        return;
      }

      lastY = currentY;
      setIsScrollingDown(currentY > REVEAL_ZONE_PX && delta > 0);
    };

    const handleScroll = (): void => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return isScrollingDown;
}

/**
 * The 82px marketing header: solid paper, one hairline underneath, no shadow.
 *
 * Two deliberate departures from DESIGN.md, both asked for: the surface is
 * opaque rather than the §3 `rgba(252,251,249,.78)` sticky wash, and the bar
 * slides out of the way while the reader scrolls down and returns the moment
 * they scroll up — §1 otherwise budgets no motion beyond colour. The slide is
 * dropped entirely under `prefers-reduced-motion`.
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
  const isScrollingDown = useIsScrollingDown();
  const { pathname } = router.state.location;
  const search = router.state.location.search as Readonly<Record<string, unknown>>;
  // An open drawer pins the bar: sliding a menu the reader just opened off the
  // top of the screen is the one case where hiding is never what they meant.
  const isHidden = isScrollingDown && !isDrawerOpen;

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen]);

  const isActive = (item: SiteNavItem): boolean => isSiteNavItemActive(item, pathname, search);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-hairline bg-panel-warm",
        "transition-transform duration-200 ease-out motion-reduce:transition-none",
        isHidden ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <div className="mx-auto flex h-20 w-full max-w-[90rem] items-center justify-between gap-6 px-4 sm:px-8 lg:h-[82px] lg:px-14">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            aria-label={t("brand.name")}
            className="flex shrink-0 items-center gap-[9px]"
            to="/"
          >
            <img
              alt={t("brand.name")}
              className="block size-14 object-contain"
              src="/brand/mma-logo.png"
            />
          </Link>

          {/* Pills, not bare text: the active page carries the `chip active`
              fill the design reserves for exactly this. DESIGN.md §2. */}
          <nav className="hidden items-center gap-1 lg:flex">
            {siteNavItems.map((item) => (
              <Link
                aria-current={isActive(item) ? "page" : undefined}
                className={cn(
                  "rounded-[var(--radius-pill)] px-3.5 py-2 text-base transition-colors",
                  isActive(item)
                    ? "bg-chip-active text-ink"
                    : "text-muted hover:bg-panel-warm hover:text-ink"
                )}
                key={`${item.to}-${item.labelKey}`}
                search={item.search}
                to={item.to}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <a
            className="hidden flex-col leading-tight transition-colors hover:text-accent xl:flex"
            href={`tel:${siteConfig.contact.helpline}`}
          >
            <span className="label-mono text-[11px] text-muted-faint">{t("nav.helpline")}</span>
            <span className="label-mono text-base text-ink">
              {format.digits(siteConfig.contact.helpline)}
            </span>
          </a>

          <LanguageSwitcher className="hidden md:inline-flex" />

          {isPending ? (
            <div className="hidden items-center gap-3 sm:flex">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-9 w-24" />
            </div>
          ) : session ? (
            <Link
              className="hidden min-h-11 items-center gap-2.5 rounded-[var(--radius-pill)] border border-hairline py-1 pl-1 pr-4 transition-colors hover:border-line-strong sm:inline-flex"
              to="/dashboard"
            >
              <Avatar
                className="size-8 text-xs"
                name={session.user.name}
                photo={session.user.image ?? null}
                sizes="32px"
              />
              <span className="max-w-40 truncate text-base text-ink">{t("nav.dashboard")}</span>
            </Link>
          ) : (
            <div className="hidden items-center gap-4 sm:flex">
              <Link className="text-base text-muted transition-colors hover:text-ink" to="/auth/sign-in">
                {t("nav.login")}
              </Link>
              <Button asChild>
                <Link to="/auth/sign-up">{t("nav.enroll")}</Link>
              </Button>
            </div>
          )}

          <button
            aria-controls="site-header-drawer"
            aria-expanded={isDrawerOpen}
            aria-label={t("nav.menu")}
            className={cn(
              "inline-flex size-11 items-center justify-center border transition-colors lg:hidden",
              isDrawerOpen
                ? "border-line-strong bg-chip-active"
                : "border-hairline hover:border-line-strong"
            )}
            onClick={() => setIsDrawerOpen((open) => !open)}
            type="button"
          >
            <MenuGlyph isOpen={isDrawerOpen} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-hairline bg-panel-warm lg:hidden",
          isDrawerOpen ? "block" : "hidden"
        )}
        id="site-header-drawer"
      >
        <nav className="mx-auto flex w-full max-w-[90rem] flex-col px-4 py-3 sm:px-8">
          {siteNavItems.map((item) => (
            <Link
              aria-current={isActive(item) ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center border-b border-hairline-faint px-3 text-base transition-colors",
                isActive(item) ? "bg-chip-active text-ink" : "text-muted hover:text-ink"
              )}
              key={`${item.to}-${item.labelKey}`}
              search={item.search}
              to={item.to}
            >
              {t(item.labelKey)}
            </Link>
          ))}

          {isPending ? (
            <div className="flex items-center gap-3 py-4 sm:hidden">
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 flex-1" />
            </div>
          ) : session ? (
            <Button asChild className="mt-4 h-11 w-full sm:hidden" size="lg">
              <Link to="/dashboard">{t("nav.dashboard")}</Link>
            </Button>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:hidden">
              <Button asChild className="h-11" size="lg" variant="outline">
                <Link to="/auth/sign-in">{t("nav.login")}</Link>
              </Button>
              <Button asChild className="h-11" size="lg">
                <Link to="/auth/sign-up">{t("nav.enroll")}</Link>
              </Button>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-4 border-t border-hairline pt-3 md:hidden">
            <a className="flex flex-col leading-tight" href={`tel:${siteConfig.contact.helpline}`}>
              <span className="label-mono text-[11px] text-muted-faint">{t("nav.helpline")}</span>
              <span className="label-mono text-base text-ink">
                {format.digits(siteConfig.contact.helpline)}
              </span>
            </a>
            <LanguageSwitcher />
          </div>
        </nav>
      </div>
    </header>
  );
}
