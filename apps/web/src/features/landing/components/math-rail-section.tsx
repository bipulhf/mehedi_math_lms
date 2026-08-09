import { Link } from "@tanstack/react-router";
import type { MessageKey } from "@mma/i18n";
import type { JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { LandingSection } from "@/features/landing/components/landing-section";
import { renderMathToHtml } from "@/lib/katex";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The branches of school mathematics, drawn as a row of six tiles.
 *
 * Each tile carries a KaTeX symbol that names the branch better than any
 * translated word could — the integral for calculus, the radical for algebra,
 * the triangle for geometry — and a label that translates for the locale.
 * The grid mirrors the catalogue's structure: the same channels, the same
 * counts, but framed as the study of mathematics itself.
 *
 * The formulae are inline here on purpose: a stack of display maths would
 * read as a textbook page; a row of small symbols reads as a course list.
 *
 * Each tile picks a hue from the spectrum so the rail reads as colourful as
 * the catalogue cards, not as a row of identical yellow glyphs.
 */
const BRANCHES: readonly {
  hue: "cyan" | "orange" | "yellow" | "rose";
  latex: string;
  labelKey: MessageKey;
}[] = [
  { hue: "cyan", labelKey: "home.mathLabel", latex: "x^{2} + y^{2} = r^{2}" },
  { hue: "orange", labelKey: "home.mathLabel2", latex: "\\int f(x)\\,dx" },
  { hue: "yellow", labelKey: "home.mathLabel3", latex: "a^{2} + b^{2} = c^{2}" },
  { hue: "rose", labelKey: "home.mathLabel4", latex: "P(A \\mid B)" },
  { hue: "cyan", labelKey: "home.mathLabel5", latex: "\\sigma^{2} = \\tfrac{1}{n}\\sum x_{i}^{2}" },
  { hue: "orange", labelKey: "home.mathLabel6", latex: "F = ma" }
];

export function MathRailSection(): JSX.Element {
  const t = useT();

  return (
    <LandingSection
      action={
        <Link
          className="border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-spectrum-ember hover:text-spectrum-ember"
          to="/categories"
        >
          {t("action.showAll")}
        </Link>
      }
      description={t("home.mathRailLead")}
      eyebrow={t("home.mathRailEyebrow")}
      title={t("home.mathRailTitle")}
      tone="warm"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BRANCHES.map((branch, index) => (
          <Reveal delayMs={index * 70} key={branch.labelKey}>
            <Link
              className="group flex h-full min-w-0 items-center gap-5 border border-hairline bg-card p-5 transition-colors hover:border-line-strong"
              to="/courses"
            >
              <span
                aria-hidden="true"
                className={`formula-display shrink-0 text-lg sm:text-xl formula-hue-${branch.hue}`}
                dangerouslySetInnerHTML={{
                  __html: renderMathToHtml(branch.latex, false)
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-medium text-ink transition-colors group-hover:text-accent">
                  {t(branch.labelKey)}
                </span>
                <span className="mt-1 block text-sm text-muted-light">
                  {t("home.subjectsEyebrow")}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-xl text-muted-light transition-colors group-hover:text-accent"
              >
                →
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}