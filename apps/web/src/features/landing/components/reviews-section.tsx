import type { JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { LandingSection } from "@/features/landing/components/landing-section";
import { RatingStars } from "@/components/ui/rating-stars";
import { useT } from "@/lib/i18n/locale-context";
import { hueForKey, spectrumClasses } from "@/lib/spectrum";

interface Review {
  name: string;
  rating: number;
  roleKey: "reviews.r1.role" | "reviews.r2.role" | "reviews.r3.role" | "reviews.r4.role";
  textKey: "reviews.r1.text" | "reviews.r2.text" | "reviews.r3.text" | "reviews.r4.text";
}

/**
 * The testimonial strip. Fictional voices until the reviews table ships a
 * public page — reviewer names are proper nouns and stay as written, the role
 * and quote are translated so the section reads natively in both locales.
 */
export function ReviewsSection(): JSX.Element {
  const t = useT();

  const reviews: readonly Review[] = [
    {
      name: "রাফসান আহমেদ",
      rating: 5,
      roleKey: "reviews.r1.role",
      textKey: "reviews.r1.text"
    },
    {
      name: "নুসরাত জাহান",
      rating: 5,
      roleKey: "reviews.r2.role",
      textKey: "reviews.r2.text"
    },
    {
      name: "তানভীর হোসেন",
      rating: 4,
      roleKey: "reviews.r3.role",
      textKey: "reviews.r3.text"
    },
    {
      name: "মেহজাবিন চৌধুরী",
      rating: 5,
      roleKey: "reviews.r4.role",
      textKey: "reviews.r4.text"
    }
  ];

  return (
    <LandingSection
      description={t("reviews.lead")}
      eyebrow={t("reviews.eyebrow")}
      title={t("reviews.title")}
      tone="warm"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((review, index) => {
            const hue = spectrumClasses(hueForKey(review.name));

            return (
              <Reveal delayMs={index * 90} key={review.name}>
                <figure
                  className={`flex h-full flex-col gap-4 border border-l-2 border-hairline bg-card p-6 transition-colors hover:border-line-strong ${hue.rule}`}
                >
                  <span aria-hidden="true" className={`text-4xl leading-none ${hue.text}`}>
                    “
                  </span>
                  <RatingStars rating={review.rating} />
                  <blockquote className="flex-1 text-base font-light leading-relaxed text-muted">
                    {t(review.textKey)}
                  </blockquote>
                  <figcaption className="space-y-1">
                    <p className="font-medium text-ink">{review.name}</p>
                    <p className="text-sm text-muted-light">{t(review.roleKey)}</p>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
      </div>
    </LandingSection>
  );
}
