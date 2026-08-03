import { Link } from "@tanstack/react-router";
import type { JSX, PropsWithChildren } from "react";

import { DotPatch, QuarterArc } from "@/components/ui/doodles";
import { useT } from "@/lib/i18n/locale-context";
import { siteConfig } from "@/lib/site";

interface AuthLayoutProps extends PropsWithChildren {
  description: string;
  title: string;
}

/**
 * Sign-in and sign-up. The handoff never designed these screens, so the chrome
 * is derived from the marketing bands rather than invented: paper background,
 * one white card with a hairline, the same doodles, no shadow.
 *
 * The old version put a marketing column beside the form. That column is gone —
 * someone on this page has already decided to sign in, and the design spends
 * its persuasion on the homepage.
 */
export function AuthLayout({ children, description, title }: AuthLayoutProps): JSX.Element {
  const t = useT();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <DotPatch className="-left-4 top-24 hidden lg:block" />
      <QuarterArc className="bottom-32 right-24 hidden lg:block" />

      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between px-4 py-6 sm:px-8 lg:px-14">
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
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[27rem] border border-hairline bg-card p-8 sm:p-10">
          <div className="mb-8 space-y-3">
            <h1 className="text-3xl font-medium leading-tight text-ink">{title}</h1>
            <p className="text-base font-light leading-relaxed text-muted">{description}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
