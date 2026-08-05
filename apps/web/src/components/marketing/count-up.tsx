import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import { useFormat } from "@/lib/i18n/locale-context";

/**
 * A number that counts up once, when it is first scrolled to. Public marketing
 * pages only — ADR-0012.
 *
 * The final value is rendered on the server and whenever motion is reduced, so
 * the figure is correct with JavaScript off and never merely decorative.
 */
export function CountUp({
  durationMs = 1100,
  suffix = "",
  value
}: {
  durationMs?: number;
  suffix?: string;
  value: number;
}): JSX.Element {
  const format = useFormat();
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const element = elementRef.current;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!element || prefersReducedMotion || value <= 0) {
      setShown(value);

      return;
    }

    let frame = 0;
    let start: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer.disconnect();

        const step = (timestamp: number): void => {
          start ??= timestamp;

          const progress = Math.min(1, (timestamp - start) / durationMs);
          // Ease out: the number should land rather than stop dead.
          const eased = 1 - (1 - progress) ** 3;

          setShown(Math.round(value * eased));

          if (progress < 1) {
            frame = window.requestAnimationFrame(step);
          }
        };

        setShown(0);
        frame = window.requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [durationMs, value]);

  return (
    <span ref={elementRef}>
      {format.number(shown)}
      {suffix}
    </span>
  );
}
