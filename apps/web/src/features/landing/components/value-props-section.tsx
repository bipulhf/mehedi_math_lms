import { GraduationCap, PencilLine, PlayCircle } from "lucide-react";
import type { JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { LandingSection } from "@/features/landing/components/landing-section";
import { useT } from "@/lib/i18n/locale-context";
import { spectrumClasses, type SpectrumHue } from "@/lib/spectrum";

/**
 * What a student gets, in three lines.
 *
 * This is the section the page was missing: the hero says who we are and the
 * catalogue says what we sell, but nothing said why any of it is worth paying
 * for. Each claim is one the product actually keeps — free classes on every
 * course, marked written papers, a certificate on completion.
 */
export function ValuePropsSection(): JSX.Element {
  const t = useT();

  const props: readonly {
    body: string;
    hue: SpectrumHue;
    icon: typeof PlayCircle;
    title: string;
  }[] = [
    {
      body: t("home.why1Body"),
      hue: "ember",
      icon: PlayCircle,
      title: t("home.why1Title")
    },
    {
      body: t("home.why2Body"),
      hue: "indigo",
      icon: PencilLine,
      title: t("home.why2Title")
    },
    {
      body: t("home.why3Body"),
      hue: "teal",
      icon: GraduationCap,
      title: t("home.why3Title")
    }
  ];

  return (
    <LandingSection
      description={t("home.whyLead")}
      eyebrow={t("home.whyEyebrow")}
      title={t("home.whyTitle")}
      tone="warm"
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {props.map((prop, index) => {
          const Icon = prop.icon;
          const hue = spectrumClasses(prop.hue);

          return (
            <Reveal delayMs={index * 90} key={prop.title}>
              <div className={`h-full border border-l-2 border-hairline bg-card p-6 ${hue.rule}`}>
                <Icon aria-hidden="true" className={`size-6 ${hue.text}`} />
                <h3 className="mt-4 text-xl font-medium leading-snug text-ink">{prop.title}</h3>
                <p className="mt-2 text-base font-light leading-relaxed text-muted">{prop.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </LandingSection>
  );
}
