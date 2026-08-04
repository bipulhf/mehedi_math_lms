import type { JSX } from "react";

import { SectionHeading } from "@/components/ui/section-heading";
import { RatingStars } from "@/components/ui/rating-stars";
import { useT } from "@/lib/i18n/locale-context";

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
    <section className="border-b border-hairline">
      <div className="mx-auto w-full max-w-[90rem] space-y-8 px-4 py-14 sm:px-8 lg:px-14 lg:py-20">
        <SectionHeading
          eyebrow={t("reviews.eyebrow")}
          description={t("reviews.lead")}
          title={t("reviews.title")}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((review) => (
            <figure
              className="group flex h-full flex-col gap-4 border border-hairline bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-md"
              key={review.name}
            >
              <RatingStars rating={review.rating} />
              <blockquote className="flex-1 text-base font-light leading-relaxed text-muted">
                “{t(review.textKey)}”
              </blockquote>
              <figcaption className="space-y-1">
                <p className="font-medium text-ink transition-colors group-hover:text-accent">
                  {review.name}
                </p>
                <p className="text-sm text-muted-light">{t(review.roleKey)}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
