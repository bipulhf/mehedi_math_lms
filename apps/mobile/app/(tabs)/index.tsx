import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  SkeletonBlock,
  StreakTrack,
  Title
} from "@/src/components/ui";
import { listMyEnrollments, type StudentEnrollment } from "@/src/lib/api";
import { shareEnrollmentDocument, type DocumentKind } from "@/src/lib/documents";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { useStreak } from "@/src/lib/use-streak";
import { colors, fonts, spacing, typography } from "@/src/theme/tokens";

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
  const isComplete = enrollment.status === "COMPLETED" || enrollment.completedAt !== null;
  const card = (
    <Pressable>
      <Card>
        <CoverImage height={140} uri={enrollment.course.coverImageUrl} />
        <View style={styles.rowBody}>
          <Title>{enrollment.course.title}</Title>
          <ProgressTrack
            completed={enrollment.progressPercentage}
            isComplete={isComplete}
            label={`${enrollment.course.title} ${t("mine.progress")}`}
            total={100}
          />
          <View style={styles.rowMeta}>
            <Body muted>
              {isComplete ? t("mine.completed") : format.percent(enrollment.progressPercentage)}
            </Body>
            {!enrollment.accessGranted ? <Badge tone="attention">{t("mine.paymentPending")}</Badge> : null}
            {enrollment.cancelledAt ? <Badge tone="attention">{t("mine.accessEnded")}</Badge> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {enrollment.accessGranted ? (
        <Link asChild href={{ params: { courseId: enrollment.course.id }, pathname: "/learn/[courseId]" }}>
          {card}
        </Link>
      ) : (
        <Link
          asChild
          href={{ params: { courseId: enrollment.course.slug }, pathname: "/courses/[courseId]" }}
        >
          {card}
        </Link>
      )}
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
        {isComplete ? (
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

function SummaryMetric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

/**
 * A payment reminder the student can quiet for this visit without losing the
 * ability to act on it — dismissing is component state, not persisted, so a
 * real unpaid balance comes back next open rather than disappearing forever.
 */
function PaymentReminderRow({
  enrollment,
  onDismiss
}: {
  enrollment: StudentEnrollment;
  onDismiss: () => void;
}): JSX.Element {
  const t = useT();

  return (
    <View style={styles.paymentItem}>
      <Link
        asChild
        href={{ params: { courseId: enrollment.course.slug }, pathname: "/courses/[courseId]" }}
      >
        <Pressable style={styles.paymentLink}>
          <Text numberOfLines={2} style={styles.paymentTitle}>
            {enrollment.course.title}
          </Text>
          <Text style={styles.paymentAction}>{t("mine.finishPayment")} &gt;</Text>
        </Pressable>
      </Link>
      <Pressable
        accessibilityLabel={t("common.close")}
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={onDismiss}
      >
        <Text style={styles.paymentDismiss}>&times;</Text>
      </Pressable>
    </View>
  );
}

/**
 * Traces `StudentDashboardHeader` + two course rows below it, block for
 * block, rather than a couple of generic cards — the point of a skeleton is
 * that the real screen doesn't visibly jump into place once it loads.
 */
function HomeSkeleton(): JSX.Element {
  return (
    <View>
      <View style={styles.hero}>
        <SkeletonBlock height={12} width="40%" />
        <View style={{ height: spacing.xs }} />
        <SkeletonBlock height={30} width="70%" />
      </View>

      <View style={styles.resumeWrap}>
        <SkeletonBlock height={14} width="30%" />
        <Card>
          <SkeletonBlock height={160} />
          <View style={styles.resumeBody}>
            <SkeletonBlock height={20} width="75%" />
            <SkeletonBlock height={8} />
            <SkeletonBlock height={44} />
          </View>
        </Card>
      </View>

      <View style={styles.streakWrap}>
        <SkeletonBlock height={64} />
      </View>

      <View style={styles.metrics}>
        {[0, 1, 2].map((key) => (
          <View key={key} style={styles.metric}>
            <SkeletonBlock height={24} width="60%" />
            <SkeletonBlock height={14} width="80%" />
          </View>
        ))}
      </View>

      <View style={styles.coursesHeading}>
        <SkeletonBlock height={22} width="40%" />
      </View>

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
    </View>
  );
}

function StudentDashboardHeader({
  activeCourses,
  averageProgress,
  awaitingPayment,
  completedCourses,
  format,
  name,
  resumeEnrollment,
  router,
  t
}: {
  activeCourses: number;
  averageProgress: number;
  awaitingPayment: readonly StudentEnrollment[];
  completedCourses: number;
  format: ReturnType<typeof useFormat>;
  name: string;
  resumeEnrollment: StudentEnrollment | undefined;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useT>;
}): JSX.Element {
  const streak = useStreak();
  const [dismissedPaymentIds, setDismissedPaymentIds] = useState<ReadonlySet<string>>(new Set());
  const visiblePayments = awaitingPayment.filter(
    (enrollment) => !dismissedPaymentIds.has(enrollment.id)
  );

  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>{t("dash.learningSummary")}</Text>
        <Text style={styles.heroTitle}>{t("dash.greeting", { name })}</Text>
      </View>

      {resumeEnrollment ? (
        <View style={styles.resumeWrap}>
          <Caption>{t("dash.resume")}</Caption>
          <Link
            asChild
            href={{ params: { courseId: resumeEnrollment.course.id }, pathname: "/learn/[courseId]" }}
          >
            <Pressable>
              <Card>
                <CoverImage height={160} uri={resumeEnrollment.course.coverImageUrl} />
                <View style={styles.resumeBody}>
                  <Title numberOfLines={2}>{resumeEnrollment.course.title}</Title>
                  <ProgressTrack
                    completed={resumeEnrollment.progressPercentage}
                    label={`${resumeEnrollment.course.title} ${t("mine.progress")}`}
                    total={100}
                  />
                  <Button
                    label={t("mine.resume")}
                    onPress={() => router.push(`/learn/${resumeEnrollment.course.id}`)}
                    variant="accent"
                  />
                </View>
              </Card>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <View style={styles.streakWrap}>
        <StreakTrack days={streak.days} label={t("dash.streak")} streakCount={streak.streakCount} />
      </View>

      <View style={styles.metrics}>
        <SummaryMetric label={t("dash.activeCourses")} value={format.number(activeCourses)} />
        <SummaryMetric label={t("dash.completedCourses")} value={format.number(completedCourses)} />
        <SummaryMetric label={t("dash.averageProgress")} value={format.percent(averageProgress)} />
      </View>

      {visiblePayments.length > 0 ? (
        <View style={styles.paymentWrap}>
          <Badge tone="attention">{t("dash.paymentAttention")}</Badge>
          <Text style={styles.paymentLead}>
            {t("dash.paymentAttentionLead", { count: format.number(visiblePayments.length) })}
          </Text>
          {visiblePayments.slice(0, 2).map((enrollment) => (
            <PaymentReminderRow
              enrollment={enrollment}
              key={enrollment.id}
              onDismiss={() =>
                setDismissedPaymentIds((current) => new Set(current).add(enrollment.id))
              }
            />
          ))}
        </View>
      ) : null}

      <View style={styles.coursesHeading}>
        <Heading>{t("nav.myCourses")}</Heading>
      </View>
    </View>
  );
}

export default function HomeScreen(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { isPending: isSessionPending, session } = useSession();
  const router = useRouter();
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

  // Signed out is not an error state here: Explore is the public storefront,
  // and a visitor should be able to browse courses before ever signing in.
  // Sign-in is one tap away (the tab bar or any enroll button), not forced.
  // An effect rather than a render-time <Redirect>: redirecting during the
  // tab navigator's own first mount raced Fabric's view mounting and crashed
  // with "child already has a parent" on a cold start.
  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/explore");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session) {
    return (
      <Screen noHeader>
        <HomeSkeleton />
      </Screen>
    );
  }

  if (!isStudent) {
    return (
      <Screen noHeader style={styles.padded}>
        <EmptyState message={t("mine.nonStudentLead")} title={t("mine.nonStudent")} />
      </Screen>
    );
  }

  const visibleEnrollments = enrollments.filter((enrollment) => enrollment.cancelledAt === null);
  const accessibleEnrollments = visibleEnrollments.filter((enrollment) => enrollment.accessGranted);
  const activeCourses = accessibleEnrollments.filter((enrollment) => enrollment.status === "ACTIVE");
  const completedCourses = visibleEnrollments.filter((enrollment) => enrollment.status === "COMPLETED");
  const awaitingPayment = visibleEnrollments.filter((enrollment) => !enrollment.accessGranted);
  const averageProgress =
    accessibleEnrollments.length === 0
      ? 0
      : Math.round(
          accessibleEnrollments.reduce((total, enrollment) => total + enrollment.progressPercentage, 0) /
            accessibleEnrollments.length
        );
  const resumeEnrollment = activeCourses
    .filter((enrollment) => enrollment.progressPercentage > 0)
    .sort((a, b) => b.progressPercentage - a.progressPercentage)[0];

  const listHeader = (
    <StudentDashboardHeader
      activeCourses={activeCourses.length}
      averageProgress={averageProgress}
      awaitingPayment={awaitingPayment}
      completedCourses={completedCourses.length}
      format={format}
      name={session.user.name}
      resumeEnrollment={resumeEnrollment}
      router={router}
      t={t}
    />
  );

  return (
    <Screen noHeader>
      {isPending ? (
        <HomeSkeleton />
      ) : visibleEnrollments.length === 0 ? (
        <View>
          {listHeader}
          <View style={styles.emptyWrap}>
            <EmptyState message={t("mine.empty")} />
          </View>
        </View>
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={visibleEnrollments}
          keyExtractor={keyExtractor}
          ListFooterComponent={<View style={styles.listFooter} />}
          ListHeaderComponent={listHeader}
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  coursesHeading: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  emptyWrap: { padding: spacing.lg },
  hero: { backgroundColor: colors.background, gap: spacing.xs, padding: spacing.xl },
  heroEyebrow: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: typography.label.fontSize,
    letterSpacing: 0.72,
    textTransform: "uppercase"
  },
  heroTitle: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 28, lineHeight: 36 },
  list: { paddingBottom: spacing.lg },
  listFooter: { height: spacing.xxl },
  metric: { flex: 1, gap: spacing.xs },
  metricLabel: { color: colors.mutedFaint, fontFamily: fonts.body, fontSize: 14 },
  metricValue: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 24 },
  metrics: {
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingTop: spacing.lg
  },
  padded: { padding: spacing.lg },
  paymentAction: { color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: 14, marginTop: spacing.xs },
  paymentDismiss: { color: colors.mutedFaint, fontFamily: fonts.monoLabel, fontSize: 20, paddingHorizontal: spacing.sm },
  paymentItem: {
    alignItems: "flex-start",
    borderTopColor: colors.accent,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingTop: spacing.md
  },
  paymentLead: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, marginVertical: spacing.md },
  paymentLink: { flex: 1 },
  paymentTitle: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 16 },
  paymentWrap: { backgroundColor: colors.panelWarm, marginHorizontal: spacing.lg, marginTop: spacing.xl, padding: spacing.lg },
  resumeBody: { gap: spacing.sm, paddingTop: spacing.md },
  resumeWrap: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  row: { gap: spacing.sm, marginBottom: spacing.lg },
  rowAction: { gap: spacing.sm },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowBody: { gap: spacing.sm, paddingTop: spacing.md },
  rowMeta: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  skeletonList: { gap: spacing.lg, padding: spacing.lg },
  streakWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
