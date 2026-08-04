import type { JSX } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingStars, Star } from "@/components/ui/rating-stars";
import type { CourseReviewPublic } from "@/lib/api/reviews";
import { useFormat, useT } from "@/lib/i18n/locale-context";

interface CourseReviewsProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isPending: boolean;
  onLoadMore: () => void;
  reviews: readonly CourseReviewPublic[];
  summary: { average: number; count: number } | null;
}

/**
 * The reviews tab. A summary card on the left — the average as a figure, the
 * star spread as bars — and the reviews themselves on the right.
 *
 * Reviews load a page at a time and append, so a course with a thousand reviews
 * stays responsive. The spread is computed from the pages loaded so far, which
 * is honest about the visible sample rather than pretending to be the whole
 * population.
 */
export function CourseReviews({
  hasNextPage,
  isFetchingNextPage,
  isPending,
  onLoadMore,
  reviews,
  summary
}: CourseReviewsProps): JSX.Element {
  const t = useT();
  const format = useFormat();

  if (isPending) {
    return (
      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
        <div className="h-64 border border-hairline bg-placeholder-fill" />
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="h-24 border-b border-hairline-faint" key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0 || summary === null || summary.count === 0) {
    return <EmptyReviews />;
  }

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    count: reviews.filter((review) => Math.round(review.rating) === star).length,
    star
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
      <aside className="self-start border border-hairline bg-card p-6 lg:sticky lg:top-8">
        <div className="flex items-end gap-3">
          <span className="text-5xl font-semibold tracking-tight text-ink">
            {format.rating(summary.average)}
          </span>
          <div className="space-y-1 pb-1">
            <RatingStars rating={summary.average} />
            <p className="text-sm text-muted-light">
              {t("course.reviews", { count: format.number(summary.count) })}
            </p>
          </div>
        </div>

        <ul className="mt-6 space-y-2.5">
          {distribution.map(({ count, star }) => {
            const share = count / Math.max(reviews.length, 1);

            return (
              <li className="flex items-center gap-3 text-sm text-muted" key={star}>
                <span className="flex w-8 items-center gap-1">
                  {format.number(star)}
                  <Star className="size-3" filled />
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bar-track">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.round(share * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-light">{format.number(count)}</span>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="min-w-0 space-y-6">
        <ul className="border-t border-hairline">
          {reviews.map((review) => (
            <li className="border-b border-hairline-faint py-6" key={review.id}>
              <div className="flex items-start gap-4">
                <Avatar className="size-10 shrink-0" name={review.authorName} photo={null} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <span className="font-medium text-ink">{review.authorName}</span>
                    <span className="text-sm text-muted-light">
                      {format.date(review.createdAt)}
                    </span>
                  </div>
                  <RatingStars rating={review.rating} />
                  {review.comment === null ? null : (
                    <p className="text-base font-light leading-relaxed text-muted">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {hasNextPage ? (
          <Button
            className="w-full"
            disabled={isFetchingNextPage}
            onClick={onLoadMore}
            size="lg"
            variant="outline"
          >
            {isFetchingNextPage ? t("common.loading") : t("action.loadMore")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyReviews(): JSX.Element {
  const t = useT();

  return (
    <div className="space-y-2 border-t border-hairline py-10 text-center">
      <p className="text-base font-medium text-ink">{t("detail.noReviews")}</p>
    </div>
  );
}
