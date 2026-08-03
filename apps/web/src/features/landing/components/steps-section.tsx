import type { JSX } from "react";

import { QuarterArc, StepCircle } from "@/components/ui/doodles";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * The three-step band on translucent white. Circled numerals, one line of copy
 * each.
 *
 * The design's third step is "নিজের গতিতে পড়" — kept. Its second is about a
 * one-time payment rather than instalments, which happens to match what the
 * schema supports, so it survives unchanged.
 */
export function StepsSection(): JSX.Element {
  const t = useT();
  const format = useFormat();

  const steps = [
    { body: t("home.stepOneBody"), title: t("home.stepOneTitle") },
    { body: t("home.stepTwoBody"), title: t("home.stepTwoTitle") },
    { body: t("home.stepThreeBody"), title: t("home.stepThreeTitle") }
  ];

  return (
    <section className="relative overflow-hidden border-b border-hairline bg-card/55">
      <QuarterArc className="right-16 top-10 hidden lg:block" />
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-3 lg:px-14 lg:py-20">
        {steps.map((step, index) => (
          <div className="flex gap-5" key={step.title}>
            <StepCircle>{format.digits(String(index + 1).padStart(2, "0"))}</StepCircle>
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-ink">{step.title}</h3>
              <p className="text-base font-light leading-relaxed text-muted">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
