import { useState, type JSX } from "react";
import type { MessageKey } from "@mma/i18n";

import { AccordionRow } from "@/components/ui/accordion";
import { LandingSection } from "@/features/landing/components/landing-section";
import { useT } from "@/lib/i18n/locale-context";
import { hueForIndex, spectrumClasses } from "@/lib/spectrum";

const faqs: readonly { answerKey: MessageKey; questionKey: MessageKey }[] = [
  { answerKey: "faq.a1", questionKey: "faq.q1" },
  { answerKey: "faq.a2", questionKey: "faq.q2" },
  { answerKey: "faq.a3", questionKey: "faq.q3" },
  { answerKey: "faq.a4", questionKey: "faq.q4" }
];

/**
 * Four hairline rows, the first open. Rows are independent — opening one never
 * closes another, which is why the open set is a Set and not an index.
 */
export function FaqSection(): JSX.Element {
  const t = useT();
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(new Set(["faq.q1"]));

  const toggle = (key: string): void => {
    setOpenKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  return (
    <LandingSection title={t("home.faqTitle")}>
      {/* Full width, like every other band. A 4xl column here left the last
          section of the page half empty against the ones above it. */}
      <div>
          {faqs.map((faq, index) => (
            <AccordionRow
              isOpen={openKeys.has(faq.questionKey)}
              key={faq.questionKey}
              onToggle={() => toggle(faq.questionKey)}
              title={
                <span className="flex items-baseline gap-3">
                  <span
                    className={`label-mono text-xs ${spectrumClasses(hueForIndex(index)).text}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{t(faq.questionKey)}</span>
                </span>
              }
            >
              <p className="max-w-[92ch] text-base font-light leading-relaxed text-muted">
                {t(faq.answerKey)}
              </p>
            </AccordionRow>
        ))}
      </div>
    </LandingSection>
  );
}
