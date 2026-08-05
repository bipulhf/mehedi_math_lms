import {
  Award,
  FileText,
  ListChecks,
  MessageCircleQuestion,
  MonitorPlay,
  PenLine
} from "lucide-react";
import type { JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { LandingSection } from "@/features/landing/components/landing-section";
import { useT } from "@/lib/i18n/locale-context";
import { hueForIndex, spectrumClasses } from "@/lib/spectrum";

/**
 * What is actually inside a course, in six tiles.
 *
 * The most universal section on every Bangladeshi edtech landing page: Shikho
 * runs six, 10 Minute School seven, Bohubrihi and Interactive Cares eight. What
 * makes it work there is that each tile is one concrete deliverable — "class
 * notes", not "quality education" — so a guardian can tell what the money buys.
 * Every tile below maps to a feature this codebase ships.
 * `docs/landing-bd-edtech-patterns.md` §8.
 */
export function PlatformFeaturesSection(): JSX.Element {
  const t = useT();

  const features: readonly { body: string; icon: typeof MonitorPlay; title: string }[] = [
    { body: t("home.get1Body"), icon: MonitorPlay, title: t("home.get1Title") },
    { body: t("home.get2Body"), icon: FileText, title: t("home.get2Title") },
    { body: t("home.get3Body"), icon: ListChecks, title: t("home.get3Title") },
    { body: t("home.get4Body"), icon: PenLine, title: t("home.get4Title") },
    { body: t("home.get5Body"), icon: MessageCircleQuestion, title: t("home.get5Title") },
    { body: t("home.get6Body"), icon: Award, title: t("home.get6Title") }
  ];

  return (
    <LandingSection
      description={t("home.whyLead")}
      eyebrow={t("home.whyEyebrow")}
      title={t("home.whyTitle")}
      tone="warm"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          // By position rather than by name: this is a fixed list, and reading
          // the six hues in order is the point.
          const hue = spectrumClasses(hueForIndex(index));

          return (
            <Reveal delayMs={(index % 3) * 80} key={feature.title}>
              <div className={`h-full border border-l-2 border-hairline bg-card p-6 ${hue.rule}`}>
                <span
                  className={`inline-flex size-11 items-center justify-center rounded-full ${hue.chip}`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-medium leading-snug text-ink">{feature.title}</h3>
                <p className="mt-2 text-base font-light leading-relaxed text-muted">
                  {feature.body}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </LandingSection>
  );
}
