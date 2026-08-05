import type { ElementType, JSX, PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface RevealProps extends PropsWithChildren {
  /** Milliseconds behind the element before it, for a staggered row. */
  as?: ElementType;
  className?: string | undefined;
  delayMs?: number | undefined;
}

/**
 * Fades a block up as it comes into view. Public marketing pages only —
 * ADR-0012; the app shell has no motion in it.
 *
 * It reveals once and then stops observing: a section that fades back out when
 * it leaves the viewport and in again when it returns turns scrolling back up
 * into a flicker.
 */
export function Reveal({
  as: Component = "div",
  children,
  className,
  delayMs = 0
}: RevealProps): JSX.Element {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    // Anything already on screen when the page loads is revealed immediately
    // rather than waiting for a scroll that may never come.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Component
      className={cn("reveal", className)}
      data-revealed={isRevealed}
      ref={elementRef}
      style={{ "--reveal-delay": `${delayMs}ms` } as React.CSSProperties}
    >
      {children}
    </Component>
  );
}
