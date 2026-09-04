import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Ionicons from "@expo/vector-icons/Ionicons";

import { CourseCouponField, type AppliedCoupon } from "@/src/components/course-coupon-field";
import { CourseReviews } from "@/src/components/course-reviews";
import { HtmlContent } from "@/src/components/html-content";
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  CoverImage,
  EmptyState,
  ErrorNotice,
  IconButton,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { StickyBar } from "@/src/components/ui-layout";
import {
  AccordionRow,
  Avatar,
  IconTile,
  PriceText,
  RatingMark,
  RingedPlay,
  Tabs
} from "@/src/components/ui-display";
import { type CourseOutlineChapter, getCourseOutline } from "@/src/lib/api/content";
import { getCourseBySlugOrId } from "@/src/lib/api/courses";
import { getMyCourseEnrollment } from "@/src/lib/api/enrollments";
import { startCheckout } from "@/src/lib/payment";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * The sales page for one course.
 *
 * It is the only screen in the app with no header at all: the cover runs to the
 * top edge with the back key floating on it, and the content sheet climbs over
 * the bottom of the image. The price and the one action never scroll away —
 * they live in a bar docked to the bottom edge, which is the whole reason this
 * screen was restructured.
 */

function formatCourseLength(
  totalDurationSeconds: number,
  t: ReturnType<typeof useT>,
  format: ReturnType<typeof useFormat>
): string | null {
  if (totalDurationSeconds <= 0) {
    return null;
  }

  const minutes = Math.round(totalDurationSeconds / 60);

  if (minutes < 60) {
    return t("course.minutes", { count: format.number(minutes) });
  }

  return t("course.hours", { count: format.number(Math.round(minutes / 60)) });
}

export default function CourseDetailScreen(): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT();
  const format = useFormat();
  const { isPending: isSessionPending, session } = useSession();
  const isStudent = session?.session.role === "STUDENT";
  const [tab, setTab] = useState<"curriculum" | "reviews" | "teacher">("curriculum");
  const [error, setError] = useState<string | null>(null);
  const [openChapterIds, setOpenChapterIds] = useState<ReadonlySet<string> | null>(null);
  // Held here rather than in the field, because the price above it and the
  // enrol call both need what the coupon resolved to.
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const courseQuery = useQuery({
    queryFn: () => getCourseBySlugOrId(courseId),
    queryKey: queryKeys.courseBySlug(courseId)
  });

  const course = courseQuery?.data ?? null;
  const resolvedCourseId = course?.id ?? "";
  const outlineQuery = useQuery({
    enabled: resolvedCourseId.length > 0,
    queryFn: () => getCourseOutline(resolvedCourseId),
    queryKey: queryKeys.courseOutline(resolvedCourseId)
  });
  const enrollmentQuery = useQuery({
    enabled: isStudent && session !== null && resolvedCourseId.length > 0,
    queryFn: () => getMyCourseEnrollment(resolvedCourseId),
    queryKey: queryKeys.enrollment(resolvedCourseId)
  });
  const chapters: readonly CourseOutlineChapter[] = outlineQuery?.data ?? [];
  const enrollment = enrollmentQuery?.data ?? null;
  const hasAccess = Boolean(enrollment?.accessGranted);

  const openChapters = openChapterIds ?? new Set(chapters[0] ? [chapters[0].id] : []);

  const toggleChapter = (id: string): void => {
    setOpenChapterIds((current) => {
      const next = new Set(current ?? (chapters[0] ? [chapters[0].id] : []));

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const expandAll = (): void => setOpenChapterIds(new Set(chapters.map((chapter) => chapter.id)));
  const collapseAll = (): void => setOpenChapterIds(new Set());

  const enrol = useMutation({
    mutationFn: () => startCheckout(course?.id ?? courseId, appliedCoupon?.code),
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    },
    onSuccess: async (outcome) => {
      if (outcome.kind === "cancelled") {
        return;
      }

      if (outcome.kind === "failed") {
        setError(outcome.reason);

        return;
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.enrollment(course?.id ?? courseId)
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.enrollments() });
      router.push({ params: { courseId: course?.id ?? courseId }, pathname: "/learn/[courseId]" });
    }
  });

  const openPlayer = (): void =>
    router.push({ params: { courseId: course?.id ?? courseId }, pathname: "/learn/[courseId]" });

  if (courseQuery?.isPending) {
    return <ScreenSkeleton rows={4} />;
  }

  if (!course) {
    return (
      <Screen style={styles.padded}>
        <Title>{t("detail.notFound")}</Title>
      </Screen>
    );
  }

  const isFree = Number(course.price) <= 0;
  // The preview endpoint is students-only, and there is nothing to discount for
  // somebody who already has the course.
  const canApplyCoupon = !isSessionPending && isStudent && !hasAccess && !isFree;
  const includes = [
    t("detail.includeLifetime"),
    t("detail.includeCertificate"),
    t("detail.includeTests"),
    t("detail.includeMaterials")
  ];
  const length = formatCourseLength(course.stats.totalDurationSeconds, t, format);

  let action: JSX.Element;

  if (isSessionPending) {
    action = <SkeletonBlock height={52} />;
  } else if (!session) {
    action = (
      <Button
        label={t("detail.enroll")}
        onPress={() => router.push("/sign-in")}
        size="lg"
        stretch
      />
    );
  } else if (!isStudent) {
    action = <Body muted>{t("detail.staffNotice")}</Body>;
  } else if (hasAccess) {
    action = (
      <Button icon="play" label={t("detail.openPlayer")} onPress={openPlayer} size="lg" stretch />
    );
  } else {
    action = (
      <Button
        isBusy={enrol.isPending}
        label={isFree ? t("detail.enrollFree") : t("detail.enroll")}
        onPress={() => enrol.mutate()}
        size="lg"
        stretch
      />
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <CoverImage bleed height={280} uri={course.coverImageUrl} />
          <View style={[styles.coverTop, { top: insets.top + spacing.sm }]}>
            <IconButton
              accessibilityLabel={t("common.back")}
              icon="chevron-back"
              onPress={() => router.back()}
            />
            {course.isExamOnly ? <Badge tone="attention">{t("course.examOnly")}</Badge> : null}
          </View>
        </View>

        {/* The sheet climbs over the bottom of the cover. */}
        <View style={styles.sheet}>
          <View style={styles.intro}>
            <View style={styles.introTop}>
              {course.category ? (
                <Text style={styles.category}>{course.category.name}</Text>
              ) : null}
              {course.stats.reviewCount > 0 ? (
                <RatingMark value={course.stats.reviewAverage ?? 0} />
              ) : null}
            </View>
            <Text style={styles.title}>{course.title}</Text>
          </View>

          {/* The facts as tiles rather than one grey sentence: a student
              comparing two courses is comparing these four numbers. */}
          <View style={styles.factRow}>
            <View style={styles.fact}>
              <IconTile icon="play-circle" size={32} tint="brand" />
              <Text style={styles.factValue}>{format.number(course.stats.lectureCount)}</Text>
              <Text style={styles.factLabel}>{t("common.lessons")}</Text>
            </View>
            <View style={styles.fact}>
              <IconTile icon="people" size={32} tint="sky" />
              <Text style={styles.factValue}>
                {format.number(course.stats.enrolledStudentCount)}
              </Text>
              <Text style={styles.factLabel}>{t("common.students")}</Text>
            </View>
            <View style={styles.fact}>
              <IconTile icon="time" size={32} tint="lilac" />
              <Text style={styles.factValue}>{length ?? "—"}</Text>
              <Text style={styles.factLabel}>{t("detail.tabCurriculum")}</Text>
            </View>
            <View style={styles.fact}>
              <IconTile icon="gift" size={32} tint="mint" />
              <Text style={styles.factValue}>{format.number(course.stats.freeLessonCount)}</Text>
              <Text style={styles.factLabel}>{t("common.free")}</Text>
            </View>
          </View>

          <HtmlContent html={course.description} muted />

          <Card>
            <Text style={styles.includesTitle}>{t("detail.includes")}</Text>
            <View style={styles.includes}>
              {includes.map((item) => (
                <View key={item} style={styles.includeRow}>
                  <Ionicons color={colors.success} name="checkmark-circle" size={18} />
                  <Text style={styles.includeText}>{item}</Text>
                </View>
              ))}
            </View>
          </Card>

          {canApplyCoupon ? (
            <Card>
              <CourseCouponField
                applied={appliedCoupon}
                courseId={resolvedCourseId}
                onApplied={setAppliedCoupon}
                publicCode={course.publicCoupon?.code ?? null}
              />
            </Card>
          ) : null}

          <Tabs
            inset={false}
            label={course.title}
            onChange={setTab}
            tabs={[
              {
                isActive: tab === "curriculum",
                label: t("detail.tabCurriculum"),
                value: "curriculum"
              },
              { isActive: tab === "reviews", label: t("detail.tabReviews"), value: "reviews" },
              { isActive: tab === "teacher", label: t("detail.tabTeacher"), value: "teacher" }
            ]}
            value={tab}
          />

          {tab === "curriculum" ? (
            chapters.length === 0 ? (
              <EmptyState message={t("detail.outlineEmpty")} />
            ) : (
              <>
                <View style={styles.outlineActions}>
                  <Button
                    label={t("detail.expandAll")}
                    onPress={expandAll}
                    size="xs"
                    variant="ghost"
                  />
                  <Button
                    label={t("detail.collapseAll")}
                    onPress={collapseAll}
                    size="xs"
                    variant="ghost"
                  />
                </View>
                <Card flush>
                  {chapters.map((chapter, index) => (
                    <AccordionRow
                      isOpen={openChapters.has(chapter.id)}
                      key={chapter.id}
                      meta={`${format.digits(String(index + 1).padStart(2, "0"))} · ${t("course.lessons", { count: chapter.lessons.length })}`}
                      onToggle={() => toggleChapter(chapter.id)}
                      title={chapter.title}
                    >
                      <View style={styles.lessonList}>
                        {chapter.lessons.map((lesson) => {
                          const lessonLength = formatCourseLength(
                            lesson.durationSeconds ?? 0,
                            t,
                            format
                          );

                          if (!lesson.isPreview) {
                            return (
                              <View key={lesson.id} style={styles.lessonRow}>
                                <View style={styles.lessonTitle}>
                                  <RingedPlay />
                                  <Text numberOfLines={1} style={styles.lessonName}>
                                    {lesson.title}
                                  </Text>
                                </View>
                                <Text style={styles.lessonMeta}>{lessonLength ?? ""}</Text>
                              </View>
                            );
                          }

                          return (
                            <Pressable
                              accessibilityLabel={lesson.title}
                              accessibilityRole="button"
                              key={lesson.id}
                              onPress={() =>
                                router.push({
                                  params: { courseId: course.slug, lectureId: lesson.id },
                                  pathname: "/courses/[courseId]/preview/[lectureId]"
                                })
                              }
                              style={styles.lessonRow}
                            >
                              <View style={styles.lessonTitle}>
                                <RingedPlay tone="accent" />
                                <Text numberOfLines={1} style={styles.lessonName}>
                                  {lesson.title}
                                </Text>
                                <Badge tone="success">{t("common.free")}</Badge>
                              </View>
                              <Text style={styles.lessonMeta}>{lessonLength ?? ""}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </AccordionRow>
                  ))}
                </Card>
              </>
            )
          ) : null}

          {tab === "reviews" ? (
            <CourseReviews canReview={hasAccess} courseId={resolvedCourseId} />
          ) : null}

          {tab === "teacher" ? (
            <Card style={{ gap: spacing.md }}>
              {course.teachers.map((teacher) =>
                teacher.slug ? (
                  <Link
                    asChild
                    href={{ params: { slug: teacher.slug }, pathname: "/teachers/[slug]" }}
                    key={teacher.id}
                  >
                    <Pressable
                      accessibilityLabel={teacher.name}
                      accessibilityRole="link"
                      style={styles.teacherRow}
                    >
                      <Avatar name={teacher.name} photo={teacher.profilePhoto} size={48} />
                      <View style={styles.teacherText}>
                        <Text style={styles.teacherName}>{teacher.name}</Text>
                        {teacher.role === "OWNER" ? <Caption>{t("detail.owner")}</Caption> : null}
                      </View>
                      <Ionicons color={colors.mutedFaint} name="chevron-forward" size={17} />
                    </Pressable>
                  </Link>
                ) : (
                  <View key={teacher.id} style={styles.teacherRow}>
                    <Avatar name={teacher.name} photo={teacher.profilePhoto} size={48} />
                    <View style={styles.teacherText}>
                      <Text style={styles.teacherName}>{teacher.name}</Text>
                      {teacher.role === "OWNER" ? <Caption>{t("detail.owner")}</Caption> : null}
                    </View>
                  </View>
                )
              )}
            </Card>
          ) : null}

          {error ? <ErrorNotice message={error} /> : null}
        </View>
      </ScrollView>

      {/* The price and the decision, docked. Scrolling a sales page should
          never take the way in off the screen. */}
      <StickyBar>
        <View style={styles.stickyRow}>
          <View>
            <Text style={styles.stickyLabel}>
              {appliedCoupon ? appliedCoupon.code : isFree ? t("common.free") : t("detail.enroll")}
            </Text>
            <PriceText amount={appliedCoupon ? appliedCoupon.payable : course.price} />
          </View>
          <View style={styles.stickyAction}>{action}</View>
        </View>
      </StickyBar>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  category: {
    color: colors.accent,
    flex: 1,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  cover: { backgroundColor: colors.accentSoft },
  coverTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg
  },
  fact: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    flex: 1,
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md
  },
  factLabel: { color: colors.mutedFaint, fontFamily: fonts.body, fontSize: 11 },
  factRow: { flexDirection: "row", gap: spacing.sm },
  factValue: { color: colors.ink, fontFamily: fonts.numeric, fontSize: 15, marginTop: 2 },
  includeRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  includes: { gap: spacing.sm, paddingTop: spacing.md },
  includesTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16 },
  includeText: { color: colors.inkMuted, fontFamily: fonts.body, fontSize: 15 },
  intro: { gap: spacing.xs },
  introTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  lessonList: { gap: 2 },
  lessonMeta: { color: colors.mutedFaint, fontFamily: fonts.body, fontSize: 12 },
  lessonName: { color: colors.inkMuted, flex: 1, fontFamily: fonts.body, fontSize: 15 },
  lessonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: spacing.xs
  },
  lessonTitle: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm },
  outlineActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end"
  },
  padded: { padding: spacing.lg },
  scroll: { paddingBottom: spacing.xxxl },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.curve,
    borderTopRightRadius: radius.curve,
    gap: spacing.lg,
    marginTop: -spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl
  },
  stickyAction: { flex: 1 },
  stickyLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  stickyRow: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  teacherName: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 16 },
  teacherRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  teacherText: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 25, lineHeight: 33 }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
