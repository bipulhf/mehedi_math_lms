import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, Redirect } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Badge,
  Body,
  Button,
  Card,
  CoverImage,
  EmptyState,
  ErrorNotice,
  Heading,
  ProgressTrack,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { listMyEnrollments, type StudentEnrollment } from "@/src/lib/api";
import { shareEnrollmentDocument } from "@/src/lib/documents";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

/**
 * Downloading and sharing is a phone-shaped action, more so than a desktop one
 * — so the certificate is offered here rather than only on the web dashboard.
 */
function CertificateAction({ enrollmentId }: { enrollmentId: string }): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  return (
    <View style={styles.rowAction}>
      <Button
        isBusy={isBusy}
        label="Save certificate"
        onPress={() => {
          setError(null);
          setIsBusy(true);
          void shareEnrollmentDocument("certificate", enrollmentId)
            .catch((cause: Error) => {
              setError(cause.message);
            })
            .finally(() => {
              setIsBusy(false);
            });
        }}
        variant="outline"
      />
      {error ? <ErrorNotice message={error} /> : null}
    </View>
  );
}

const EnrollmentRow = memo(function EnrollmentRow({
  enrollment
}: {
  enrollment: StudentEnrollment;
}): JSX.Element {
  return (
    <View style={styles.row}>
      <Link
        asChild
        href={{ params: { courseId: enrollment.course.id }, pathname: "/learn/[courseId]" }}
      >
        <Pressable>
          <Card>
            <CoverImage height={140} uri={enrollment.course.coverImageUrl} />
            <View style={styles.rowBody}>
              <Title>{enrollment.course.title}</Title>
              <ProgressTrack
                completed={enrollment.progressPercentage}
                label={`${enrollment.course.title} progress`}
                total={100}
              />
              <View style={styles.rowMeta}>
                <Body muted>{enrollment.progressPercentage}% complete</Body>
                {enrollment.status === "COMPLETED" ? (
                  <Badge tone="positive">Completed</Badge>
                ) : null}
                {/* Entitlement, not progress: a refund cancels access without
                    touching what the student already did. ADR-0001. */}
                {enrollment.cancelledAt ? <Badge tone="warning">Access ended</Badge> : null}
              </View>
            </View>
          </Card>
        </Pressable>
      </Link>
      {/* Outside the Link on purpose: a button nested inside a pressable row
          would fire the navigation as well as itself. */}
      {enrollment.status === "COMPLETED" ? (
        <CertificateAction enrollmentId={enrollment.id} />
      ) : null}
    </View>
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
    return <ScreenSkeleton rows={2} />;
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
  row: { gap: spacing.sm, marginBottom: spacing.lg },
  rowAction: { gap: spacing.sm },
  rowBody: { gap: spacing.sm, paddingTop: spacing.md },
  rowMeta: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  skeletonList: { gap: spacing.lg, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
