import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { HtmlContent } from "@/src/components/html-content";
import {
  Body,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { getCourseReviewSummary, listCourseReviews, submitCourseReview } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { colors, radius, spacing } from "@/src/theme/tokens";

/**
 * Course reviews. The app could enrol but not review, so mobile students never
 * contributed a rating — and the homepage now renders real aggregates built
 * from exactly these.
 *
 * The API decides who may post one (an enrolled student, once); this only shows
 * the form to someone with access and reports the refusal if it comes.
 */

const RATINGS = [1, 2, 3, 4, 5] as const;

function Stars({ rating }: { rating: number }): JSX.Element {
  return (
    <Caption>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </Caption>
  );
}

function RatingPicker({
  onChange,
  value
}: {
  onChange: (rating: number) => void;
  value: number;
}): JSX.Element {
  return (
    <View style={styles.ratingRow}>
      {RATINGS.map((rating) => (
        <Pressable
          accessibilityLabel={`${rating} star${rating === 1 ? "" : "s"}`}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === rating }}
          key={rating}
          onPress={() => onChange(rating)}
          style={[styles.ratingChip, value === rating ? styles.ratingChipActive : null]}
        >
          <Body>{rating}</Body>
        </Pressable>
      ))}
    </View>
  );
}

export function CourseReviews({
  canReview,
  courseId
}: {
  canReview: boolean;
  courseId: string;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWriting, setIsWriting] = useState(false);

  const [summaryQuery, reviewsQuery] = useQueries({
    queries: [
      {
        queryFn: async () => getCourseReviewSummary(courseId),
        queryKey: queryKeys.courseReviewSummary(courseId)
      },
      {
        queryFn: async () => listCourseReviews(courseId),
        queryKey: queryKeys.courseReviews(courseId)
      }
    ]
  });

  const submit = useMutation({
    mutationFn: async () =>
      submitCourseReview(courseId, {
        comment: comment.trim().length > 0 ? comment.trim() : undefined,
        rating
      }),
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: async () => {
      setIsWriting(false);
      setComment("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.courseReviews(courseId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.courseReviewSummary(courseId) });
    }
  });

  if (summaryQuery?.isPending || reviewsQuery?.isPending) {
    return (
      <Card>
        <SkeletonBlock height={20} width="40%" />
        <View style={{ height: spacing.sm }} />
        <SkeletonBlock height={14} />
      </Card>
    );
  }

  const summary = summaryQuery?.data ?? { average: 0, count: 0 };
  const reviews = reviewsQuery?.data ?? [];

  return (
    <Card>
      <View style={styles.header}>
        <Title>Reviews</Title>
        {summary.count > 0 ? (
          <Caption>
            {summary.average.toFixed(1)} from {summary.count}
          </Caption>
        ) : null}
      </View>
      <View style={{ height: spacing.sm }} />

      {error ? (
        <>
          <ErrorNotice message={error} />
          <View style={{ height: spacing.md }} />
        </>
      ) : null}

      {canReview ? (
        isWriting ? (
          <View style={styles.form}>
            <RatingPicker onChange={setRating} value={rating} />
            <Field
              label="Your review"
              multiline
              onChangeText={setComment}
              placeholder="What was it like to study this?"
              style={styles.multiline}
              value={comment}
            />
            <Button isBusy={submit.isPending} label="Post review" onPress={() => submit.mutate()} />
            <Button label="Cancel" onPress={() => setIsWriting(false)} variant="ghost" />
          </View>
        ) : (
          <Button label="Write a review" onPress={() => setIsWriting(true)} variant="outline" />
        )
      ) : null}

      {reviews.length === 0 ? (
        <Body muted>No reviews yet.</Body>
      ) : (
        reviews.map((review) => (
          <View key={review.id} style={styles.review}>
            <View style={styles.header}>
              <Body>{review.authorName}</Body>
              <Stars rating={review.rating} />
            </View>
            {review.comment ? <HtmlContent html={review.comment} muted /> : null}
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingBottom: spacing.lg },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" },
  ratingChip: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  ratingChipActive: { backgroundColor: colors.secondaryContainer, borderColor: colors.primary },
  ratingRow: { flexDirection: "row", gap: spacing.sm },
  review: { gap: spacing.xs, paddingVertical: spacing.sm }
});
