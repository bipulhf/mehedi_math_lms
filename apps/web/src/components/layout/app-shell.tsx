import { Link, useRouter } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type JSX, type PropsWithChildren, type ReactNode } from "react";

import { LanguageSwitcher } from "@/components/common/language-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth";
import { useT } from "@/lib/i18n/locale-context";
import { hueForIndex, spectrumClasses } from "@/lib/spectrum";
import { cn } from "@/lib/utils";

export interface AppShellNavItem {
  badge?: number | undefined;
  icon: LucideIcon;
  label: string;
  to: string;
}

interface AppShellProps extends PropsWithChildren {
  /** Sits under the sidebar nav — today's classes, today's numbers. */
  contextPanel?: ReactNode;
  description: string | null;
  isLoading?: boolean | undefined;
  navItems: readonly AppShellNavItem[];
  /** The one accent action in the bar. Exactly one, per DESIGN.md §1. */
  primaryAction?: ReactNode;
  title: string;
}

/**
 * The dashboard shell: a 74px bar over a 238px sidebar. DESIGN.md §5.
 *
 * The previous version leaned on `backdrop-blur` for its floating panels,
 * which created stacking contexts and cost a real bug — the notification panel
 * was trapped inside the header and painted under the content card. There is
 * no blur here and no shadow, so the panel's own z-index is the only thing
 * deciding what covers what.
 *
 * Below `lg` the sidebar becomes a drawer. It is rendered in place rather than
 * duplicated, so the nav cannot differ across the breakpoint.
 */
export function AppShell({
  children,
  contextPanel,
  isLoading,
  navItems,
  primaryAction,
  title
}: AppShellProps): JSX.Element {
  const router = useRouter();
  const t = useT();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSignOut = async (): Promise<void> => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await authClient.signOut();
      await router.navigate({ to: "/auth/sign-in" });
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [router.state.location.pathname]);

  return (
    <div className="flex min-h-screen flex-col" data-surface="ink">
      <header className="sticky top-0 z-40 border-b border-hairline bg-panel-warm/95">
        <div className="flex h-[74px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            aria-expanded={isDrawerOpen}
            aria-label={t("nav.menu")}
            className="inline-flex size-11 shrink-0 items-center justify-center border border-hairline text-ink lg:hidden"
            onClick={() => setIsDrawerOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {isDrawerOpen ? "×" : "≡"}
            </span>
          </button>

          <Link aria-label={t("brand.name")} className="flex shrink-0 items-center" to="/">
            <img
              alt={t("brand.name")}
              className="block size-11 object-contain"
              src="/brand/mma-logo.png"
            />
          </Link>

          <span aria-hidden="true" className="hidden h-6 w-px bg-hairline sm:block" />

          <h1 className="min-w-0 flex-1 truncate text-lg font-medium text-ink">{title}</h1>

          <div className="flex shrink-0 items-center gap-3">
            {primaryAction}
            <LanguageSwitcher className="hidden md:inline-flex" />
            {isLoading ? null : <NotificationBell />}
            <button
              className="min-h-11 px-2 text-base text-muted transition-colors hover:text-ink disabled:opacity-55"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
              type="button"
            >
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {isDrawerOpen ? (
          <button
            aria-label={t("common.close")}
            className="fixed inset-0 z-30 bg-black/70 lg:hidden"
            onClick={() => setIsDrawerOpen(false)}
            type="button"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[238px] flex-col gap-8 overflow-y-auto",
            "border-r border-hairline bg-card px-4 py-6",
            "lg:sticky lg:top-[74px] lg:z-0 lg:h-[calc(100vh-74px)] lg:bg-card/50",
            isDrawerOpen ? "flex" : "hidden lg:flex"
          )}
        >
          <nav className="flex flex-col gap-1">
            {isLoading
              ? Array.from({ length: 6 }, (_, index) => (
                  <Skeleton className="h-11 w-full" key={index} />
                ))
              : navItems.map((item, index) => {
                  const Icon = item.icon;
                  // A hue per row, on the icon alone. The label stays muted, so
                  // the sidebar reads as a list rather than as a paint chart.
                  const hue = spectrumClasses(hueForIndex(index));

                  return (
                    <Link
                      activeOptions={{ exact: item.to === "/dashboard" }}
                      activeProps={{ className: "bg-chip-active text-ink [&_[data-dot]]:bg-accent" }}
                      className="flex min-h-11 items-center gap-3 px-3 text-base text-muted transition-colors hover:bg-panel-warm hover:text-ink"
                      key={item.to}
                      to={item.to}
                    >
                      <span
                        aria-hidden="true"
                        className="size-[7px] shrink-0 rounded-full bg-transparent"
                        data-dot
                      />
                      <Icon aria-hidden="true" className={cn("size-4 shrink-0", hue.text)} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 ? (
                        <span className="label-mono text-xs text-accent">{item.badge}</span>
                      ) : null}
                    </Link>
                  );
                })}
          </nav>

          {contextPanel}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-9">{children}</main>
      </div>
    </div>
  );
}
