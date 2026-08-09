import type { HTMLAttributes, JSX, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

/**
 * Surface-aware rounded plate. Ink surfaces use translucent panels; paper uses
 * solid cards. Hover changes border without moving content.
 *
 * Header, content and footer step from `p-4` to `p-6` at `sm`. This is the most
 * repeated padding in the app, and 24px a side inside a 16px page gutter left a
 * 360px phone 272px of usable card.
 */
export function Card({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-hairline bg-card transition-colors duration-200 hover:border-brand-cyan/50",
        className
      )}
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
    <div className={cn("space-y-3 p-4 sm:p-6", className)} {...props}>
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
      className={cn("text-xl font-bold leading-snug text-ink sm:text-2xl", className)}
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
    <p className={cn("text-base leading-relaxed text-muted", className)} {...props}>
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
    <div className={cn("p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props}>
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
    <div className={cn("flex items-center gap-3 p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props}>
      {children}
    </div>
  );
}
