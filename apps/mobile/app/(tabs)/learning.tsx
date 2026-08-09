import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useState } from "react";
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
  ScreenSkeleton,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { listMyEnrollments, type StudentEnrollment } from "@/src/lib/api";
import { shareEnrollmentDocument, type DocumentKind } from "@/src/lib/documents";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
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

function QuickAction({ label, onPress }: { label: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.quickAction}>
      <Text style={styles.quickActionLabel}>{label}</Text>
      <Text style={styles.quickActionArrow}>&gt;</Text>
    </Pressable>
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
  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>{t("dash.learningSummary")}</Text>
        <Text style={styles.heroTitle}>{t("dash.greeting", { name })}</Text>
        <Text style={styles.heroLead}>{t("dash.learningSummaryLead")}</Text>
        <Pressable onPress={() => router.push("/")} style={styles.heroButton}>
          <Text style={styles.heroButtonLabel}>{t("dash.browseCourses")}</Text>
        </Pressable>
        <View style={styles.metrics}>
          <SummaryMetric label={t("dash.activeCourses")} value={format.number(activeCourses)} />
          <SummaryMetric label={t("dash.completedCourses")} value={format.number(completedCourses)} />
          <SummaryMetric label={t("dash.averageProgress")} value={format.percent(averageProgress)} />
        </View>
      </View>

      {resumeEnrollment ? (
        <View style={styles.resumeWrap}>
          <Caption>{t("dash.resume")}</Caption>
          <Card>
            <View style={styles.resumeRow}>
              <View style={styles.resumeCover}>
                <CoverImage height={72} uri={resumeEnrollment.course.coverImageUrl} />
              </View>
              <View style={styles.resumeBody}>
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

      {awaitingPayment.length > 0 ? (
        <View style={styles.paymentWrap}>
          <Badge tone="attention">{t("dash.paymentAttention")}</Badge>
          <Text style={styles.paymentLead}>
            {t("dash.paymentAttentionLead", { count: format.number(awaitingPayment.length) })}
          </Text>
          {awaitingPayment.slice(0, 2).map((enrollment) => (
            <Link
              asChild
              href={{ params: { courseId: enrollment.course.slug }, pathname: "/courses/[courseId]" }}
              key={enrollment.id}
            >
              <Pressable style={styles.paymentItem}>
                <Text numberOfLines={2} style={styles.paymentTitle}>
                  {enrollment.course.title}
                </Text>
                <Text style={styles.paymentAction}>{t("mine.finishPayment")} &gt;</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}

      <View style={styles.quickWrap}>
        <Title>{t("dash.quickActions")}</Title>
        <View style={styles.quickCard}>
          <QuickAction label={t("dash.openMessages")} onPress={() => router.push("/messages")} />
          <QuickAction label={t("dash.viewPayments")} onPress={() => router.push("/payments")} />
          <QuickAction label={t("dash.browseCourses")} onPress={() => router.push("/")} />
        </View>
      </View>

      <View style={styles.coursesHeading}>
        <Heading>{t("nav.myCourses")}</Heading>
      </View>
    </View>
  );
}

export default function LearningScreen(): JSX.Element {
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

  if (isSessionPending) {
    return <ScreenSkeleton rows={3} />;
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
    <Screen>
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
  hero: { backgroundColor: colors.background, gap: spacing.md, padding: spacing.xl },
  heroButton: {
    alignSelf: "flex-start",
    borderColor: colors.brandCyan,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  heroButtonLabel: { color: colors.brandCyan, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  heroEyebrow: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: typography.label.fontSize,
    letterSpacing: 0.72,
    textTransform: "uppercase"
  },
  heroLead: { color: colors.ink, fontFamily: fonts.body, fontSize: 16, lineHeight: 25, opacity: 0.7 },
  heroTitle: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 28, lineHeight: 36 },
  list: { paddingBottom: spacing.lg },
  listFooter: { height: spacing.xxl },
  metric: { flex: 1, gap: spacing.xs },
  metricLabel: { color: colors.mutedFaint, fontFamily: fonts.body, fontSize: 14 },
  metricValue: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 24 },
  metrics: { borderTopColor: colors.muted, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, paddingTop: spacing.lg },
  padded: { padding: spacing.lg },
  paymentAction: { color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: 14, marginTop: spacing.xs },
  paymentItem: { borderTopColor: colors.accent, borderTopWidth: 1, paddingTop: spacing.md },
  paymentLead: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, marginVertical: spacing.md },
  paymentTitle: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 16 },
  paymentWrap: { backgroundColor: colors.panelWarm, marginHorizontal: spacing.lg, marginTop: spacing.xl, padding: spacing.lg },
  quickAction: { alignItems: "center", borderBottomColor: colors.hairlineFaint, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 48 },
  quickActionArrow: { color: colors.ink, fontFamily: fonts.monoLabel, fontSize: 18 },
  quickActionLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 16 },
  quickCard: { borderColor: colors.hairline, borderWidth: 1, marginTop: spacing.md, paddingHorizontal: spacing.md },
  quickWrap: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  resumeBody: { flex: 1, gap: spacing.xs },
  resumeCover: { height: 72, overflow: "hidden", width: 96 },
  resumeRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  resumeWrap: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  row: { gap: spacing.sm, marginBottom: spacing.lg },
  rowAction: { gap: spacing.sm },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowBody: { gap: spacing.sm, paddingTop: spacing.md },
  rowMeta: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  skeletonList: { gap: spacing.lg, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
