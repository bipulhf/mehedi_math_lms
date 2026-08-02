import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, Redirect } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Badge,
  Body,
  BootIndicator,
  Card,
  CoverImage,
  EmptyState,
  Heading,
  Screen,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { listMyEnrollments, type StudentEnrollment } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { colors, radius, spacing } from "@/src/theme/tokens";

function ProgressTrack({ percentage }: { percentage: number }): JSX.Element {
  // The web player uses a chunked tracker; here the row is too small for
  // chunks, so it is a single filled track using the same two tokens.
  return (
    <View style={styles.track}>
      <View style={[styles.trackFill, { width: `${Math.min(100, Math.max(0, percentage))}%` }]} />
    </View>
  );
}

const EnrollmentRow = memo(function EnrollmentRow({
  enrollment
}: {
  enrollment: StudentEnrollment;
}): JSX.Element {
  return (
    <Link
      asChild
      href={{ params: { courseId: enrollment.course.id }, pathname: "/learn/[courseId]" }}
    >
      <Pressable style={styles.row}>
        <Card>
          <CoverImage height={140} uri={enrollment.course.coverImageUrl} />
          <View style={styles.rowBody}>
            <Title>{enrollment.course.title}</Title>
            <ProgressTrack percentage={enrollment.progressPercentage} />
            <View style={styles.rowMeta}>
              <Body muted>{enrollment.progressPercentage}% complete</Body>
              {enrollment.status === "COMPLETED" ? <Badge tone="positive">Completed</Badge> : null}
              {/* Entitlement, not progress: a refund cancels access without
                  touching what the student already did. ADR-0001. */}
              {enrollment.cancelledAt ? <Badge tone="warning">Access ended</Badge> : null}
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
});

export default function LearningScreen(): JSX.Element {
  const { isPending: isSessionPending, session } = useSession();
  const isStudent = session?.session.role === "STUDENT";
  const { data: enrollments = [], isPending } = useQuery({
    enabled: isStudent,
    queryFn: listMyEnrollments,
    queryKey: queryKeys.enrollments()
  });

  const renderItem = useCallback(
    ({ item }: { item: StudentEnrollment }) => <EnrollmentRow enrollment={item} />,
    []
  );
  const keyExtractor = useCallback((item: StudentEnrollment) => item.id, []);

  if (isSessionPending) {
    return <BootIndicator />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (!isStudent) {
    return (
      <Screen style={styles.padded}>
        <EmptyState
          message="Enrolments belong to student accounts. Teaching tools live on the web dashboard."
          title="Nothing to learn here"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>My courses</Heading>
      </View>

      {isPending ? (
        <View style={styles.skeletonList}>
          {[0, 1].map((key) => (
            <Card key={key}>
              <SkeletonBlock height={140} />
              <View style={styles.rowBody}>
                <SkeletonBlock height={20} width="60%" />
                <SkeletonBlock height={8} />
              </View>
            </Card>
          ))}
        </View>
      ) : enrollments.length === 0 ? (
        <EmptyState
          message="Find a course in the catalog and enrol to see it here."
          title="No enrolments yet"
        />
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={enrollments}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg },
  list: { padding: spacing.lg },
  padded: { padding: spacing.lg },
  row: { marginBottom: spacing.lg },
  rowBody: { gap: spacing.sm, paddingTop: spacing.md },
  rowMeta: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  skeletonList: { gap: spacing.lg, padding: spacing.lg },
  track: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.full,
    height: 8,
    overflow: "hidden"
  },
  trackFill: { backgroundColor: colors.secondary, height: 8 }
});
