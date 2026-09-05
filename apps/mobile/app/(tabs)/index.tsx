import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  IconButton,
  Screen,
  SkeletonBlock,
  tabScrollInset
} from "@/src/components/ui";
import { LinkPressable } from "@/src/components/link-pressable";
import { CurvedHeader } from "@/src/components/ui-layout";
import {
  Avatar,
  IconTile,
  ProgressRing,
  ProgressTrack,
  SectionHeader,
  StatCard,
  StreakTrack
} from "@/src/components/ui-display";
import { listMyEnrollments, type StudentEnrollment } from "@/src/lib/api/enrollments";
import { shareEnrollmentDocument, type DocumentKind } from "@/src/lib/documents";
import { useFormat, useT } from "@/src/lib/locale";
import { getNotificationUnreadCount } from "@/src/lib/api/notifications";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { useStreak } from "@/src/lib/use-streak";
import { fonts, layout, radius, spacing, tintForKey, type TintName } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * The student's home.
 *
 * The screen answers one question before any other — *where was I* — so the
 * indigo header carries only identity, and the first white plate, half of it
 * lifted into that colour, is the course in progress with the ring showing how
 * far in. Everything else is a shelf under it.
 */

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
  const styles = useStyles();
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const share = async (): Promise<void> => {
    setError(null);
    setIsBusy(true);

    try {
      await shareEnrollmentDocument(kind, enrollmentId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to share this document.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={styles.rowAction}>
      <Button
        icon={kind === "certificate" ? "ribbon" : "receipt"}
        isBusy={isBusy}
        label={label}
        onPress={() => void share()}
        size="xs"
        variant="soft"
      />
      {error ? <ErrorNotice message={error} /> : null}
    </View>
  );
}

/**
 * A shelf row: the course's initial in its own colour, the title, and the bar.
 * A cover thumbnail at this size is a smear — the letter and the colour are
 * what a student actually recognises a row by.
 */
const EnrollmentRow = memo(function EnrollmentRow({
  enrollment
}: {
  enrollment: StudentEnrollment;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const t = useT();
  const format = useFormat();
  const isComplete = enrollment.status === "COMPLETED" || enrollment.completedAt !== null;
  const tint = colors.tint[tintForKey(enrollment.course.id)];
  const card = (
    <Pressable
      accessibilityLabel={enrollment.course.title}
      accessibilityRole="link"
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <Card>
        <View style={styles.rowTop}>
          <View style={[styles.rowMark, { backgroundColor: tint.bg }]}>
            <Text style={[styles.rowMarkText, { color: tint.fg }]}>
              {enrollment.course.title.trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.rowText}>
            <Text numberOfLines={2} style={styles.rowTitle}>
              {enrollment.course.title}
            </Text>
            <Text style={styles.rowMeta}>{enrollment.category.name}</Text>
          </View>
          <Text style={styles.rowPercent}>
            {isComplete ? "100%" : format.percent(enrollment.progressPercentage)}
          </Text>
        </View>

        <View style={styles.rowTrack}>
          <ProgressTrack
            completed={enrollment.progressPercentage}
            isComplete={isComplete}
            label={`${enrollment.course.title} ${t("mine.progress")}`}
            total={100}
          />
        </View>

        {!enrollment.accessGranted || enrollment.cancelledAt || isComplete ? (
          <View style={styles.rowBadges}>
            {isComplete ? <Badge tone="success">{t("mine.completed")}</Badge> : null}
            {!enrollment.accessGranted ? (
              <Badge tone="attention">{t("mine.paymentPending")}</Badge>
            ) : null}
            {enrollment.cancelledAt ? <Badge tone="danger">{t("mine.accessEnded")}</Badge> : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {enrollment.accessGranted ? (
        <Link
          asChild
          href={{ params: { courseId: enrollment.course.id }, pathname: "/learn/[courseId]" }}
        >
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

/** One of the four squares under the resume card. */
function QuickAction({
  icon,
  label,
  onPress,
  tint
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tint: TintName;
}): JSX.Element {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed ? styles.pressed : null]}
    >
      <IconTile icon={icon} size={52} tint={tint} />
      <Text numberOfLines={1} style={styles.quickLabel}>
        {label}
      </Text>
    </Pressable>
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
  const styles = useStyles();
  const colors = useThemeColors();
  const t = useT();

  return (
    <View style={styles.paymentItem}>
      <IconTile icon="card" size={40} tint="gold" />
      <Link
        asChild
        href={{ params: { courseId: enrollment.course.slug }, pathname: "/courses/[courseId]" }}
      >
        <Pressable
          accessibilityLabel={enrollment.course.title}
          accessibilityRole="link"
          style={styles.paymentLink}
        >
          <Text numberOfLines={2} style={styles.paymentTitle}>
            {enrollment.course.title}
          </Text>
          <Text style={styles.paymentAction}>{t("mine.finishPayment")} →</Text>
        </Pressable>
      </Link>
      <Pressable
        accessibilityLabel={t("common.close")}
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={onDismiss}
      >
        <Ionicons color={colors.mutedFaint} name="close" size={20} />
      </Pressable>
    </View>
  );
}

/**
 * Traces the header, the resume plate and two shelf rows block for block — the
 * point of a skeleton is that the real screen doesn't visibly jump into place.
 */
function HomeSkeleton(): JSX.Element {
  const styles = useStyles();
  return (
    <View>
      <CurvedHeader>
        <View style={styles.headerRow}>
          <SkeletonBlock height={48} style={styles.skeletonAvatar} width={48} />
          <View style={styles.headerText}>
            <SkeletonBlock height={10} width="35%" />
            <View style={{ height: spacing.sm }} />
            <SkeletonBlock height={20} width="60%" />
          </View>
        </View>
      </CurvedHeader>
      <View style={styles.body}>
        <SkeletonBlock height={132} style={styles.skeletonResume} />
        <View style={styles.quickRow}>
          {[0, 1, 2, 3].map((key) => (
            <View key={key} style={styles.quickAction}>
              <SkeletonBlock height={52} style={styles.skeletonTile} width={52} />
              <SkeletonBlock height={10} width="70%" />
            </View>
          ))}
        </View>
        <View style={styles.statRow}>
          {[0, 1, 2].map((key) => (
            <SkeletonBlock height={104} key={key} style={styles.skeletonStat} />
          ))}
        </View>
        {[0, 1].map((key) => (
          <Card key={key}>
            <SkeletonBlock height={20} width="55%" />
            <View style={{ height: spacing.md }} />
            <SkeletonBlock height={8} />
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
  photo,
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
  photo: string | null;
  resumeEnrollment: StudentEnrollment | undefined;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useT>;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const streak = useStreak();
  // The bell is the only way into notifications now, so it has to say when
  // there is something behind it.
  const { data: unreadNotifications = 0 } = useQuery({
    queryFn: getNotificationUnreadCount,
    queryKey: queryKeys.unreadNotifications()
  });
  const [dismissedPaymentIds, setDismissedPaymentIds] = useState<ReadonlySet<string>>(new Set());
  const visiblePayments = awaitingPayment.filter(
    (enrollment) => !dismissedPaymentIds.has(enrollment.id)
  );

  return (
    <View>
      <CurvedHeader>
        <View style={styles.headerRow}>
          <Link asChild href="/profile">
            <Pressable accessibilityLabel={t("nav.profile")} accessibilityRole="link">
              <Avatar name={name} photo={photo} ring size={48} />
            </Pressable>
          </Link>
          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>{t("dash.learningSummary")}</Text>
            <Text numberOfLines={1} style={styles.headerName}>
              {t("dash.greeting", { name })}
            </Text>
          </View>
          {/* Straight to the notifications feed. It used to open the inbox,
              which then showed messages and made the reader find the other
              segment themselves. */}
          <IconButton
            accessibilityLabel={t("nav.notify")}
            badge={unreadNotifications > 0}
            icon="notifications"
            onPress={() => router.push("/notifications")}
            tone="onPaper"
          />
        </View>

        {/* A search bar that is really a door: this app's catalogue lives one
            tab over, and typing here would only duplicate it. */}
        <Pressable
          accessibilityLabel={t("courses.searchPlaceholder")}
          accessibilityRole="button"
          onPress={() => router.push("/explore")}
          style={({ pressed }) => [styles.searchDoor, pressed ? styles.pressed : null]}
        >
          <Ionicons color={colors.mutedFaint} name="search" size={19} />
          <Text numberOfLines={1} style={styles.searchDoorText}>
            {t("courses.searchPlaceholder")}
          </Text>
        </Pressable>
      </CurvedHeader>

      <View style={styles.body}>
        {/* The one plate that overlaps the colour above it. */}
        {resumeEnrollment ? (
          <LinkPressable
            accessibilityLabel={resumeEnrollment.course.title}
            href={{
              params: { courseId: resumeEnrollment.course.id },
              pathname: "/learn/[courseId]"
            }}
            pressedStyle={styles.pressed}
            style={styles.lift}
          >
            <Card>
              <View style={styles.resumeRow}>
                <ProgressRing
                  label={`${resumeEnrollment.course.title} ${t("mine.progress")}`}
                  percent={resumeEnrollment.progressPercentage}
                  size={62}
                />
                <View style={styles.resumeText}>
                  <Text style={styles.resumeEyebrow}>{t("dash.resume")}</Text>
                  <Text numberOfLines={2} style={styles.resumeTitle}>
                    {resumeEnrollment.course.title}
                  </Text>
                </View>
              </View>
              <View style={styles.resumeAction}>
                <View style={styles.resumeButton}>
                  <Ionicons color={colors.onAccent} name="play" size={14} />
                  <Text style={styles.resumeButtonLabel}>{t("mine.resume")}</Text>
                </View>
              </View>
            </Card>
          </LinkPressable>
        ) : (
          <Card style={styles.lift}>
            <Text style={styles.resumeEyebrow}>{t("dash.learningSummary")}</Text>
            <Text numberOfLines={2} style={styles.resumeTitle}>
              {t("dash.browseCourses")}
            </Text>
            <View style={{ height: spacing.lg }} />
            <Button
              icon="compass"
              label={t("mine.browse")}
              onPress={() => router.push("/explore")}
              stretch
            />
          </Card>
        )}

        <View style={styles.quickRow}>
          <QuickAction
            icon="document-text"
            label={t("exams.title")}
            onPress={() => router.push("/exams")}
            tint="coral"
          />
          <QuickAction
            icon="chatbubbles"
            label={t("nav.messages")}
            onPress={() => router.push("/inbox")}
            tint="mint"
          />
          <QuickAction
            icon="card"
            label={t("nav.payments")}
            onPress={() => router.push("/payments")}
            tint="sky"
          />
          <QuickAction
            icon="compass"
            label={t("nav.explore")}
            onPress={() => router.push("/explore")}
            tint="lilac"
          />
        </View>

        <View style={styles.statRow}>
          <StatCard
            icon="book"
            label={t("dash.activeCourses")}
            tint="brand"
            value={format.number(activeCourses)}
          />
          <StatCard
            icon="checkmark-circle"
            label={t("dash.completedCourses")}
            tint="mint"
            value={format.number(completedCourses)}
          />
          <StatCard
            icon="trending-up"
            label={t("dash.averageProgress")}
            tint="gold"
            value={format.percent(averageProgress)}
          />
        </View>

        <Card>
          <StreakTrack days={streak.days} label={t("dash.streak")} streakCount={streak.streakCount} />
        </Card>

        {visiblePayments.length > 0 ? (
          <Card style={styles.paymentWrap} tone="gold">
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
          </Card>
        ) : null}

        <SectionHeader
          actionLabel={t("action.showAll")}
          onAction={() => router.push("/explore")}
          title={t("nav.myCourses")}
        />
      </View>
    </View>
  );
}

export default function HomeScreen(): JSX.Element {
  const styles = useStyles();
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
    return (
      <Screen>
        <HomeSkeleton />
      </Screen>
    );
  }

  // Home needs an account, and while signed out its tab is not in the bar at
  // all — so a visitor who lands here (cold start, deep link) is sent to the
  // one public tab rather than left on a screen they cannot navigate away from.
  if (!session) {
    return <Redirect href="/explore" />;
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
  const activeCourses = accessibleEnrollments.filter(
    (enrollment) => enrollment.status === "ACTIVE"
  );
  const completedCourses = visibleEnrollments.filter(
    (enrollment) => enrollment.status === "COMPLETED"
  );
  const awaitingPayment = visibleEnrollments.filter((enrollment) => !enrollment.accessGranted);
  const averageProgress =
    accessibleEnrollments.length === 0
      ? 0
      : Math.round(
          accessibleEnrollments.reduce(
            (total, enrollment) => total + enrollment.progressPercentage,
            0
          ) / accessibleEnrollments.length
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
      photo={session.user.image}
      resumeEnrollment={resumeEnrollment}
      router={router}
      t={t}
    />
  );

  return (
    <Screen>
      {isPending ? (
        <HomeSkeleton />
      ) : visibleEnrollments.length === 0 ? (
        // A student with no courses still gets the whole dashboard above the
        // empty state, and that is taller than a phone — so this branch needs
        // a scroller of its own rather than the plain view it used to be.
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          showsVerticalScrollIndicator={false}
        >
          {listHeader}
          <EmptyState message={t("mine.empty")} />
        </ScrollView>
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={visibleEnrollments}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  body: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  emptyScroll: { gap: spacing.lg, paddingBottom: tabScrollInset },
  headerEyebrow: {
    color: colors.paper,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    opacity: 0.8,
    textTransform: "uppercase"
  },
  headerName: { color: colors.paper, fontFamily: fonts.display, fontSize: 23, lineHeight: 31 },
  headerRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  headerText: { flex: 1, gap: 1 },
  // Everything that rises into the header does it by exactly this much.
  lift: { marginTop: -layout.headerOverlap },
  list: { paddingBottom: tabScrollInset },
  padded: { padding: spacing.lg },
  paymentAction: {
    color: colors.accent,
    fontFamily: fonts.displaySemiBold,
    fontSize: 13,
    marginTop: 2
  },
  paymentItem: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  paymentLead: {
    color: colors.tint.gold.fg,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 21
  },
  paymentLink: { flex: 1 },
  paymentTitle: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 15, lineHeight: 21 },
  paymentWrap: { gap: spacing.md },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  quickAction: { alignItems: "center", flex: 1, gap: spacing.sm },
  quickLabel: {
    color: colors.inkMuted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    textAlign: "center"
  },
  quickRow: { flexDirection: "row", gap: spacing.sm },
  resumeAction: { paddingTop: spacing.lg },
  resumeButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: radius.tile,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.xl
  },
  resumeButtonLabel: { color: colors.onAccent, fontFamily: fonts.displayBold, fontSize: 15 },
  resumeEyebrow: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  resumeRow: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  resumeText: { flex: 1, gap: 2 },
  resumeTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 26 },
  row: { gap: spacing.sm, paddingBottom: spacing.md, paddingHorizontal: spacing.lg },
  rowAction: { gap: spacing.sm },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowBadges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.md },
  rowMark: {
    alignItems: "center",
    borderRadius: radius.tile,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  rowMarkText: { fontFamily: fonts.display, fontSize: 22 },
  rowMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  rowPercent: { color: colors.accent, fontFamily: fonts.numeric, fontSize: 16 },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 22 },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  rowTrack: { paddingTop: spacing.md },
  searchDoor: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.tile,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    minHeight: 50,
    paddingHorizontal: spacing.lg
  },
  searchDoorText: { color: colors.mutedFaint, flex: 1, fontFamily: fonts.body, fontSize: 15 },
  skeletonAvatar: { borderRadius: radius.full },
  skeletonResume: { borderRadius: radius.square, marginTop: -layout.headerOverlap },
  skeletonStat: { borderRadius: radius.square, flex: 1 },
  skeletonTile: { borderRadius: radius.tile },
  statRow: { flexDirection: "row", gap: spacing.sm }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
