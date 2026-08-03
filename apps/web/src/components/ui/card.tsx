import type { HTMLAttributes, JSX, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

/**
 * Square, solid white, one hairline. DESIGN.md §6.
 *
 * The missing radius and missing shadow are both deliberate. Depth on this
 * surface comes from the page texture showing through translucent panels, and
 * a card is what sits solidly on top of it. Hover raises the border to
 * `line-strong`; nothing lifts or scales.
 */
export function Card({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>): JSX.Element {
  return (
    <div
      className={cn("border border-hairline bg-card transition-colors duration-150", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>): JSX.Element {
  return (
    <div className={cn("space-y-3 p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>): JSX.Element {
  return (
    <h3
      className={cn("text-xl font-medium leading-snug text-ink sm:text-2xl", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>): JSX.Element {
  return (
    <p className={cn("text-base font-light leading-relaxed text-muted", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>): JSX.Element {
  return (
    <div className={cn("p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>): JSX.Element {
  return (
    <div className={cn("flex items-center gap-3 p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
}
