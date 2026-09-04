import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

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
import {
  getCourseReviewSummary,
  listCourseReviews,
  submitCourseReview
} from "@/src/lib/api/reviews";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { Avatar } from "@/src/components/ui-display";
import { fonts, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * Course reviews. The app could enrol but not review, so mobile students never
 * contributed a rating — and the homepage now renders real aggregates built
 * from exactly these.
 *
 * The API decides who may post one (an enrolled student, once); this only shows
 * the form to someone with access and reports the refusal if it comes.
 */

const RATINGS = [1, 2, 3, 4, 5] as const;

/** Five stars, drawn. `★`/`☆` in a text run rendered as two different glyph
 *  widths in Bangla fallback and read as damaged text. */
function Stars({ rating, size = 15 }: { rating: number; size?: number }): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.starRow}>
      {RATINGS.map((star) => (
        <Ionicons
          color={star <= rating ? colors.tint.gold.solid : colors.barIdle}
          key={star}
          name={star <= rating ? "star" : "star-outline"}
          size={size}
        />
      ))}
    </View>
  );
}

/** Tap the star you mean. A row of numbered chips asked the reader to do the
 *  conversion themselves. */
function RatingPicker({
  onChange,
  value
}: {
  onChange: (rating: number) => void;
  value: number;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.ratingRow}>
      {RATINGS.map((rating) => (
        <Pressable
          accessibilityLabel={`${rating} star${rating === 1 ? "" : "s"}`}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === rating }}
          hitSlop={spacing.xs}
          key={rating}
          onPress={() => onChange(rating)}
        >
          <Ionicons
            color={rating <= value ? colors.tint.gold.solid : colors.barIdle}
            name={rating <= value ? "star" : "star-outline"}
            size={34}
          />
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
  const styles = useStyles();
  const t = useT();
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
      setError(null);
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
        <Title>{t("detail.tabReviews")}</Title>
        {summary.count > 0 ? (
          <Caption>
            {t("detail.reviewSummary", {
              average: summary.average.toFixed(1),
              count: summary.count
            })}
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
              label={t("review.yourReviewLabel")}
              multiline
              onChangeText={setComment}
              placeholder={t("review.placeholder")}
              style={styles.multiline}
              value={comment}
            />
            <Button
              icon="send"
              isBusy={submit.isPending}
              label={t("review.post")}
              onPress={() => submit.mutate()}
              stretch
            />
            <Button
              label={t("action.cancel")}
              onPress={() => setIsWriting(false)}
              stretch
              variant="ghost"
            />
          </View>
        ) : (
          <Button
            icon="star"
            label={t("review.write")}
            onPress={() => setIsWriting(true)}
            stretch
            variant="outline"
          />
        )
      ) : null}

      {reviews.length === 0 ? (
        <Body muted>{t("detail.noReviews")}</Body>
      ) : (
        reviews.map((review, index) => (
          <View key={review.id} style={[styles.review, index === 0 ? null : styles.reviewDivider]}>
            <View style={styles.reviewHead}>
              <Avatar name={review.authorName} photo={null} size={36} />
              <View style={styles.reviewWho}>
                <Text numberOfLines={1} style={styles.reviewName}>
                  {review.authorName}
                </Text>
                <Stars rating={review.rating} size={13} />
              </View>
            </View>
            {review.comment ? <HtmlContent html={review.comment} muted /> : null}
          </View>
        ))
      )}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  form: { gap: spacing.md, paddingBottom: spacing.lg },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" },
  ratingRow: { flexDirection: "row", gap: spacing.sm },
  review: { gap: spacing.sm, paddingVertical: spacing.md },
  reviewDivider: { borderTopColor: colors.separator, borderTopWidth: 1 },
  reviewHead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  reviewName: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 15 },
  reviewWho: { flex: 1, gap: 3 },
  starRow: { flexDirection: "row", gap: 2 }
}));
