import type { JSX } from "react";

import { renderMathToHtml } from "@/lib/katex";

/**
 * A thin band that runs a row of maths identities across the screen.
 *
 * DESIGN.md §7 calls the marquee out as one of the doodles, and at 46s the
 * scroll is calm enough to read on a second pass but fast enough not to feel
 * decorative. The list is doubled and translated by -50% so the loop is
 * seamless and the row never resets.
 *
 * The formulae are rendered server-side as KaTeX; the client only animates
 * the wrap, so the maths is correct on the first paint rather than after
 * hydration.
 *
 * The hues rotate across the spectrum — cyan, orange, yellow, rose — so the
 * band reads as colourful as the rest of the page rather than as a single
 * streak of yellow.
 */
const STATEMENTS: readonly { hue: "cyan" | "orange" | "yellow" | "rose"; latex: string }[] = [
  { hue: "cyan", latex: "a^{2} + b^{2} = c^{2}" },
  { hue: "orange", latex: "e^{i\\pi} + 1 = 0" },
  { hue: "yellow", latex: "\\sum_{i=1}^{n} i = \\tfrac{n(n+1)}{2}" },
  { hue: "rose", latex: "F = ma" },
  { hue: "cyan", latex: "\\frac{d}{dx}\\sin x = \\cos x" },
  { hue: "orange", latex: "x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}" },
  { hue: "yellow", latex: "\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)" }
];

export function FormulaMarqueeSection(): JSX.Element | null {
  if (STATEMENTS.length === 0) {
    return null;
  }

  const row = STATEMENTS.map((statement, index) => ({
    ...statement,
    id: `s-${index}`
  }));
  const doubled = [...row, ...row];

  return (
    <section
      aria-hidden="true"
      className="relative overflow-hidden border-y border-hairline bg-panel-warm py-6"
    >
      <div className="formula-display flex w-max animate-formula-marquee gap-8 px-6 text-base sm:gap-12 sm:text-lg lg:text-xl">
        {doubled.map((statement, index) => (
          <span
            className={`flex shrink-0 items-center gap-8 sm:gap-12 formula-hue-${statement.hue}`}
            dangerouslySetInnerHTML={{
              __html: renderMathToHtml(statement.latex, false)
            }}
            key={`${statement.id}-${index}`}
          />
        ))}
      </div>
    </section>
  );
}