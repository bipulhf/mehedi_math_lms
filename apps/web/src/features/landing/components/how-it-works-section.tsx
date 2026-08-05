import type { JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { StepCircle } from "@/components/ui/doodles";
import { LandingSection } from "@/features/landing/components/landing-section";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * Four numbered steps, from an account to a certificate.
 *
 * Interactive Cares runs this as four steps and Mojaru as five, and both do it
 * for the same reason: the question that stops a purchase is not "is this
 * good", it is "what happens after I pay".
 * `docs/landing-bd-edtech-patterns.md` §9.
 */
export function HowItWorksSection(): JSX.Element {
  const t = useT();
  const format = useFormat();

  const steps: readonly { body: string; title: string }[] = [
    { body: t("home.step1Body"), title: t("home.step1Title") },
    { body: t("home.step2Body"), title: t("home.step2Title") },
    { body: t("home.step3Body"), title: t("home.step3Title") },
    { body: t("home.step4Body"), title: t("home.step4Title") }
  ];

  return (
    <LandingSection
      description={t("home.stepsLead")}
      eyebrow={t("home.stepsEyebrow")}
      title={t("home.stepsTitle")}
    >
      <ol className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <Reveal as="li" delayMs={index * 80} key={step.title}>
            {/* The numeral goes through `digits`: a step number is a label, not
                a quantity, and grouping it would print 0,01. */}
            <StepCircle>{format.digits(String(index + 1).padStart(2, "0"))}</StepCircle>
            <h3 className="mt-4 text-lg font-medium leading-snug text-ink">{step.title}</h3>
            <p className="mt-2 text-base font-light leading-relaxed text-muted">{step.body}</p>
          </Reveal>
        ))}
      </ol>
    </LandingSection>
  );
}
