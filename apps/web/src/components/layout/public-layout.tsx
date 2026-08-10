import type { JSX, PropsWithChildren, ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DiamondTrio, DotPatch, FaintFormula, QuarterArc } from "@/components/ui/doodles";
import { cn } from "@/lib/utils";

interface PublicLayoutProps extends PropsWithChildren {
  /** A breadcrumb line above the title. */
  eyebrow?: string | undefined;
  /** Renders the page-head block. Omit on pages that open with their own hero. */
  subtitle?: ReactNode;
  title?: ReactNode;
}

/**
 * The one chrome every public page wears: 82px header, content, footer.
 *
 * This replaced two layouts that disagreed with each other — a `LandingLayout`
 * with its own nav and footer, and a `PublicLayout` that wrapped its children
 * in a marketing hero. The design has a single header and a single footer, so
 * there is one of each here, and the optional page-head block below is what
 * the second layout's callers used.
 */
export function PublicLayout({
  children,
  eyebrow,
  subtitle,
  title
}: PublicLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col" data-surface="ink">
      <SiteHeader />

      {title === undefined ? null : (
        <div className="relative overflow-hidden border-b border-hairline">
          <DotPatch className="-right-6 top-6 hidden lg:block" />
          <QuarterArc className="right-32 top-16 hidden lg:block" />
          <DiamondTrio className="bottom-10 right-14 hidden lg:flex" />
          <FaintFormula className="-bottom-8 -left-4 hidden lg:block" glyph="Σ" />
          <div className="mx-auto w-full max-w-[90rem] space-y-4 px-4 py-12 sm:px-8 lg:px-14 lg:py-16">
            {eyebrow === undefined ? null : (
              <p className="label-mono text-xs uppercase text-muted-faint">{eyebrow}</p>
            )}
            <h1 className="max-w-[20ch] text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              {title}
            </h1>
            {subtitle === undefined ? null : (
              <p className="max-w-[48ch] text-lg font-light leading-relaxed text-muted">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>
  );
}

/** Standard horizontal gutters — 56px at the design width, less on a phone. */
export function PublicSection({
  children,
  className
}: PropsWithChildren<{ className?: string }>): JSX.Element {
  return (
    <div className={cn("mx-auto w-full max-w-[90rem] px-4 py-12 sm:px-8 lg:px-14", className)}>
      {children}
    </div>
  );
}
