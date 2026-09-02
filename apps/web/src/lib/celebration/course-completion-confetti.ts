import confetti from "canvas-confetti";

/** The brand blue and its two golds. Confetti gets the same colours as everything else. */
const BRAND_COLORS = ["#007BFF", "#F5A723", "#DC9109"];

/**
 * A short burst for the one moment in the app shell that earns motion: a
 * student just finished a course. DESIGN.md §1 otherwise limits app-shell
 * surfaces to colour/border transitions — this is a deliberate, scoped
 * exception for a genuine milestone, not decorative page motion.
 *
 * Skips entirely under `prefers-reduced-motion`.
 */
export function fireCourseCompletionConfetti(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const end = Date.now() + 1500;

  (function frame() {
    confetti({
      angle: 60,
      colors: BRAND_COLORS,
      origin: { x: 0, y: 0.7 },
      particleCount: 3,
      spread: 60
    });
    confetti({
      angle: 120,
      colors: BRAND_COLORS,
      origin: { x: 1, y: 0.7 },
      particleCount: 3,
      spread: 60
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
