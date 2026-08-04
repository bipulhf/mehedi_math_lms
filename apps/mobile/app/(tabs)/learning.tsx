import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Badge,
  Body,
  Button,
  Caption,
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
import { shareEnrollmentDocument, type DocumentKind } from "@/src/lib/documents";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

/**
 * Downloading and sharing is a phone-shaped action, more so than a desktop one
 * — so the certificate and receipt are offered here rather than only on the
 * web dashboard. The share sheet doubles as the preview.
 */
function DocumentAction({
  enrollmentId,
  kind,
  label
}: {
  enrollmentId: string;
  kind: DocumentKind;
  label: string;
}): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  return (
    <View style={styles.rowAction}>
      <Button
        isBusy={isBusy}
        label={label}
        onPress={() => {
          setError(null);
          setIsBusy(true);
          void shareEnrollmentDocument(kind, enrollmentId)
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
  const t = useT();
  const format = useFormat();

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
                label={`${enrollment.course.title} ${t("mine.progress")}`}
                total={100}
              />
              <View style={styles.rowMeta}>
                <Body muted>{format.percent(enrollment.progressPercentage)}</Body>
                {enrollment.status === "COMPLETED" ? (
                  <Badge tone="faded">{t("mine.completed")}</Badge>
                ) : null}
                {/* Entitlement, not progress: a refund cancels access without
                    touching what the student already did. ADR-0001. */}
                {enrollment.cancelledAt ? <Badge tone="attention">{t("mine.accessEnded")}</Badge> : null}
              </View>
            </View>
          </Card>
        </Pressable>
      </Link>
      {/* Outside the Link on purpose: a button nested inside a pressable row
          would fire the navigation as well as itself. */}
      <View style={styles.rowActions}>
        {enrollment.latestPaymentStatus === "SUCCESS" ? (
          <DocumentAction
            enrollmentId={enrollment.id}
            kind="receipt"
            label={t("mine.downloadReceipt")}
          />
        ) : null}
        {enrollment.status === "COMPLETED" ? (
          <DocumentAction
            enrollmentId={enrollment.id}
            kind="certificate"
            label={t("mine.downloadCertificate")}
          />
        ) : null}
      </View>
    </View>
  );
});

export default function LearningScreen(): JSX.Element {
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const router = useRouter();
  const isStudent = session?.session.role === "STUDENT";
  const { data: enrollments = [], isPending } = useQuery({
    enabled: isStudent,
    queryFn: listMyEnrollments,
    queryKey: queryKeys.enrollments()
  });

  // The resume card surfaces the most recent in-progress course — the web
  // dashboard's greeting and resume card collapsed into one row (§11 Q3).
  const resumeEnrollment = enrollments
    .filter((enrollment) => enrollment.status === "ACTIVE" && !enrollment.cancelledAt)
    .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))[0];

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
        <EmptyState message={t("mine.nonStudentLead")} title={t("mine.nonStudent")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>{t("mine.title")}</Heading>
      </View>

      {resumeEnrollment && !isPending ? (
        <View style={styles.resumeWrap}>
          <Card>
            <View style={styles.resumeRow}>
              <View style={styles.resumeCover}>
                <CoverImage height={72} uri={resumeEnrollment.course.coverImageUrl} />
              </View>
              <View style={styles.resumeBody}>
                <Caption>{t("mine.continue")}</Caption>
                <Body numberOfLines={1}>{resumeEnrollment.course.title}</Body>
                <ProgressTrack
                  completed={resumeEnrollment.progressPercentage}
                  label={`${resumeEnrollment.course.title} ${t("mine.progress")}`}
                  total={100}
                />
              </View>
              <Button
                label={t("mine.resume")}
                onPress={() => router.push(`/learn/${resumeEnrollment.course.id}`)}
                size="sm"
              />
            </View>
          </Card>
        </View>
      ) : null}

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
        <EmptyState message={t("mine.empty")} />
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
  resumeBody: { flex: 1, gap: spacing.xs },
  resumeCover: { height: 72, overflow: "hidden", width: 96 },
  resumeRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  resumeWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  row: { gap: spacing.sm, marginBottom: spacing.lg },
  rowAction: { gap: spacing.sm },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowBody: { gap: spacing.sm, paddingTop: spacing.md },
  rowMeta: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  skeletonList: { gap: spacing.lg, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
