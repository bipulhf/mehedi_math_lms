import type { JSX, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface FadeInProps extends PropsWithChildren {
  className?: string | undefined;
  delayClassName?: string | undefined;
}

/**
 * Now a plain wrapper. It used to run an entrance animation, which DESIGN.md
 * §1 forbids outright — the client rejected a livelier direction as visually
 * stressful.
 *
 * Kept only so the routes that wrap sections in it keep compiling while they
 * are rebuilt. Each phase drops its own uses and Phase 12 deletes the
 * component. Do not reach for it in new markup.
 */
export function FadeIn({ children, className, delayClassName }: FadeInProps): JSX.Element {
  return <div className={cn(delayClassName, className)}>{children}</div>;
}
