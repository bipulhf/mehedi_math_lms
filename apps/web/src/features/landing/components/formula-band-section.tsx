import { Link } from "@tanstack/react-router";
import type { MessageKey } from "@mma/i18n";
import type { CSSProperties, JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { LandingSection } from "@/features/landing/components/landing-section";
import { renderMathToHtml } from "@/lib/katex";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The identity band that says "this is a maths academy" without writing the
 * word.
 *
 * Four formulae render as KaTeX display maths, each captioned with the kind of
 * idea it stands in for. The numerals are yellow, the typeface is the serif
 * DESIGN.md §4 reserves for mathematical identity, and the section sits in the
 * ink register so the maths is the lightest thing on the page.
 *
 * Kept deliberately short — the maths is here for identity, not for teaching,
 * and four is enough to read as "maths, plural" without becoming a wall of
 * equations.
 *
 * Each formula carries a hue from the spectrum so the band reads as colourful
 * as the rest of the catalogue rather than a wall of identical yellow
 * equations. The hue is set as a CSS variable on the formula node, and the
 * `.formula-display` rule picks it up.
 */
const FORMULAS: readonly {
  altKey: MessageKey;
  hue: "cyan" | "orange" | "yellow" | "rose";
  latex: string;
}[] = [
  { altKey: "home.formulaAlt1", hue: "cyan", latex: "\\frac{d}{dx}\\sin x = \\cos x" },
  { altKey: "home.formulaAlt2", hue: "orange", latex: "\\int_{a}^{b} x^{2}\\,dx = \\tfrac{1}{3}\\bigl(b^{3}-a^{3}\\bigr)" },
  { altKey: "home.formulaAlt3", hue: "yellow", latex: "x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}" },
  { altKey: "home.formulaAlt4", hue: "rose", latex: "P(A \\cap B) = P(A)\\,P(B)" }
];

export function FormulaBandSection(): JSX.Element {
  const t = useT();

  return (
    <LandingSection
      description={t("home.formulaLead")}
      eyebrow={t("home.formulaEyebrow")}
      title={t("home.formulaTitle")}
    >
      <div className="grid gap-x-2 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {FORMULAS.map((formula, index) => (
          <Reveal delayMs={index * 110} key={formula.latex}>
            <figure className="min-w-0 space-y-3 text-center">
              <div
                aria-hidden="true"
                className={`formula-display flex min-w-0 items-center justify-center py-2 text-base sm:text-lg lg:text-xl formula-hue-${formula.hue}`}
                dangerouslySetInnerHTML={{
                  __html: renderMathToHtml(formula.latex, true)
                }}
                style={{ "--formula-hue": `var(--color-hue-${formula.hue})` } as CSSProperties}
              />
              <figcaption className="mx-auto max-w-[28ch] text-sm font-light leading-relaxed text-muted">
                {t(formula.altKey)}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-12 flex items-center justify-center gap-4">
          <span aria-hidden="true" className="formula-rule flex-1" />
          <Link
            className="border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-spectrum-ember hover:text-spectrum-ember"
            to="/courses"
          >
            {t("action.viewAllCourses")} →
          </Link>
          <span aria-hidden="true" className="formula-rule flex-1" />
        </div>
      </Reveal>
    </LandingSection>
  );
}