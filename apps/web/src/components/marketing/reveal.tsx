import type { ElementType, JSX, PropsWithChildren } from "react";
import { useLayoutEffect, useRef, useState } from "react";

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

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    // Anything already on screen at mount is revealed synchronously, before
    // the browser paints — waiting on IntersectionObserver's async callback
    // here means content above the fold sits invisible until the observer
    // gets a turn, which on a page hydrating a dozen sections at once can
    // take a visible beat.
    const rect = element.getBoundingClientRect();
    const isAlreadyVisible = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;

    if (isAlreadyVisible) {
      setIsRevealed(true);
      return;
    }

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
