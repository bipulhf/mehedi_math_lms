import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { CourseReviews } from "@/src/components/course-reviews";
import { HtmlContent } from "@/src/components/html-content";
import {
  AccordionRow,
  Avatar,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  CoverImage,
  EmptyState,
  ErrorNotice,
  Heading,
  PriceText,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  Tabs,
  Title
} from "@/src/components/ui";
import {
  getCourse,
  getCourseOutline,
  getMyCourseEnrollment,
  type CourseOutlineChapter
} from "@/src/lib/api";
import { startCheckout } from "@/src/lib/payment";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

function formatCourseLength(totalDurationSeconds: number, t: ReturnType<typeof useT>, format: ReturnType<typeof useFormat>): string | null {
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
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT();
  const format = useFormat();
  const { isPending: isSessionPending, session } = useSession();
  const isStudent = session?.session.role === "STUDENT";
  const [tab, setTab] = useState<"curriculum" | "reviews" | "teacher">("curriculum");
  const [error, setError] = useState<string | null>(null);
  const [openChapterIds, setOpenChapterIds] = useState<ReadonlySet<string>>(new Set());

  const [courseQuery, outlineQuery, enrollmentQuery] = useQueries({
    queries: [
      { queryFn: () => getCourse(courseId), queryKey: queryKeys.course(courseId) },
      { queryFn: () => getCourseOutline(courseId), queryKey: queryKeys.courseContent(courseId) },
      {
        enabled: isStudent && session !== null,
        queryFn: () => getMyCourseEnrollment(courseId),
        queryKey: queryKeys.enrollment(courseId)
      }
    ]
  });

  const course = courseQuery?.data ?? null;
  const chapters: readonly CourseOutlineChapter[] = outlineQuery?.data ?? [];
  const enrollment = enrollmentQuery?.data ?? null;
  const hasAccess = Boolean(enrollment?.accessGranted);

  const openChapters =
    openChapterIds.size === 0 ? new Set(chapters[0] ? [chapters[0].id] : []) : openChapterIds;

  const toggleChapter = (id: string): void => {
    setOpenChapterIds((current) => {
      const next = new Set(current);

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
    mutationFn: () => startCheckout(courseId),
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

      await queryClient.invalidateQueries({ queryKey: queryKeys.enrollment(courseId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.enrollments() });
      router.push({ params: { courseId }, pathname: "/learn/[courseId]" });
    }
  });

  const openPlayer = (): void => router.push({ params: { courseId }, pathname: "/learn/[courseId]" });

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
  const includes = [
    t("detail.includeLifetime"),
    t("detail.includeCertificate"),
    t("detail.includeTests"),
    t("detail.includeMaterials")
  ];

  let action: JSX.Element;

  if (isSessionPending) {
    action = <SkeletonBlock height={48} />;
  } else if (!session) {
    action = (
      <Button label={t("detail.enroll")} onPress={() => router.push("/sign-in")} size="lg" />
    );
  } else if (!isStudent) {
    action = <Body muted>{t("detail.staffNotice")}</Body>;
  } else if (hasAccess) {
    action = <Button label={t("detail.openPlayer")} onPress={openPlayer} size="lg" />;
  } else {
    action = (
      <Button
        isBusy={enrol.isPending}
        label={isFree ? t("detail.enrollFree") : t("detail.enroll")}
        onPress={() => enrol.mutate()}
        size="lg"
      />
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: course.title }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CoverImage height={200} uri={course.coverImageUrl} />
        <Heading>{course.title}</Heading>
        <View style={styles.metaRow}>
          {course.category ? <Badge>{course.category.name}</Badge> : null}
          {course.isExamOnly ? <Badge tone="attention">{t("course.examOnly")}</Badge> : null}
        </View>
        <Caption>
          {t("detail.curriculumSummary", {
            lessons: format.number(course.stats.lectureCount),
            modules: chapters.length
          })}
          {course.stats.reviewCount > 0
            ? ` · ${t("detail.reviewSummary", {
                average: format.rating(course.stats.reviewAverage ?? 0),
                count: course.stats.reviewCount
              })}`
            : ""}
        </Caption>
        <HtmlContent html={course.description} muted />

        <Card style={{ gap: spacing.md }}>
          <PriceText amount={course.price} />
          {action}
          <View style={styles.includes}>
            <Caption>{t("detail.includes")}</Caption>
            {includes.map((item) => (
              <Body muted key={item}>
                ✓ {item}
              </Body>
            ))}
          </View>
        </Card>

        <Tabs
          label={course.title}
          onChange={setTab}
          tabs={[
            { isActive: tab === "curriculum", label: t("detail.tabCurriculum"), value: "curriculum" },
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
                <Pressable onPress={expandAll}>
                  <Caption>{t("detail.expandAll")}</Caption>
                </Pressable>
                <Pressable onPress={collapseAll}>
                  <Caption>{t("detail.collapseAll")}</Caption>
                </Pressable>
              </View>
              {chapters.map((chapter, index) => (
                <AccordionRow
                  isOpen={openChapters.has(chapter.id)}
                  key={chapter.id}
                  meta={
                    <Caption tone="faint">
                      {format.digits(String(index + 1).padStart(2, "0"))} ·{" "}
                      {t("course.lessons", { count: chapter.lessons.length })}
                    </Caption>
                  }
                  onToggle={() => toggleChapter(chapter.id)}
                  title={chapter.title}
                >
                  <View style={styles.lessonList}>
                    {chapter.lessons.map((lesson) => {
                      const length = formatCourseLength(lesson.durationSeconds ?? 0, t, format);

                      if (!lesson.isPreview) {
                        return (
                          <View key={lesson.id} style={styles.lessonRow}>
                            <Body muted numberOfLines={1}>
                              {lesson.title}
                            </Body>
                            <Caption tone="faint">{length ?? ""}</Caption>
                          </View>
                        );
                      }

                      return (
                        <Pressable
                          key={lesson.id}
                          onPress={() =>
                            router.push({
                              params: { courseId, lectureId: lesson.id },
                              pathname: "/courses/[courseId]/preview/[lectureId]"
                            })
                          }
                          style={styles.lessonRow}
                        >
                          <View style={styles.lessonTitle}>
                            <Body muted numberOfLines={1}>
                              {lesson.title}
                            </Body>
                            <Badge tone="faded">{t("common.free")}</Badge>
                          </View>
                          <Caption tone="faint">{length ?? ""}</Caption>
                        </Pressable>
                      );
                    })}
                  </View>
                </AccordionRow>
              ))}
            </>
          )
        ) : null}

        {tab === "reviews" ? <CourseReviews canReview={hasAccess} courseId={courseId} /> : null}

        {tab === "teacher" ? (
          <Card style={{ gap: spacing.md }}>
            {course.teachers.map((teacher) => (
              <View key={teacher.id} style={styles.teacherRow}>
                <Avatar name={teacher.name} photo={teacher.profilePhoto} />
                <View style={styles.teacherText}>
                  <Body>{teacher.name}</Body>
                  {teacher.role === "OWNER" ? (
                    <Caption>{t("detail.owner")}</Caption>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {error ? <ErrorNotice message={error} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg },
  includes: { gap: spacing.xs },
  lessonList: { gap: spacing.xs },
  lessonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingVertical: spacing.xs
  },
  lessonTitle: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm
  },
  metaRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  outlineActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "flex-end"
  },
  padded: { padding: spacing.lg },
  teacherRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  teacherText: { flex: 1, gap: 2 }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";