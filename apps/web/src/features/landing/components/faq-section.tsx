import { useState, type JSX } from "react";
import type { MessageKey } from "@genex/i18n";

import { AccordionRow } from "@/components/ui/accordion";
import { SectionHeading } from "@/components/ui/section-heading";
import { useT } from "@/lib/i18n/locale-context";

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
    <section className="border-b border-hairline">
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[340px_1fr] lg:gap-16 lg:px-14 lg:py-20">
        <SectionHeading title={t("home.faqTitle")} />

        <div>
          {faqs.map((faq) => (
            <AccordionRow
              isOpen={openKeys.has(faq.questionKey)}
              key={faq.questionKey}
              onToggle={() => toggle(faq.questionKey)}
              title={t(faq.questionKey)}
            >
              <p className="max-w-[60ch] text-base font-light leading-relaxed text-muted">
                {t(faq.answerKey)}
              </p>
            </AccordionRow>
          ))}
        </div>
      </div>
    </section>
  );
}
