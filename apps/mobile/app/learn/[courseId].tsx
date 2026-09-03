import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { CourseCompletionNotice } from "@/src/components/course-completion-notice";
import { CourseRoutinePanel } from "@/src/components/course-routine-panel";
import { LectureBody, MaterialLinks, getPdfMaterial } from "@/src/components/lecture-body";
import { LectureComments } from "@/src/components/lecture-comments";
import { LessonPickerSheet, type NavigationItem } from "@/src/components/lesson-picker-sheet";
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  Heading,
  Screen,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { StatCard, Tabs } from "@/src/components/ui-display";
import { type ContentLecture, getCourseContent } from "@/src/lib/api/content";
import { getCourse } from "@/src/lib/api/courses";
import { listCourseNotices } from "@/src/lib/api/notices";
import { getCourseProgress, markLectureComplete } from "@/src/lib/api/progress";
import { getCourseAssessments } from "@/src/lib/api/tests";
import { ApiError } from "@/src/lib/api-client";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useRecordStudyActivity } from "@/src/lib/use-streak";
import { radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * The course player. Lectures and tests are unified into one `sortOrder`-ordered
 * navigator so a class and its chapter's test are a single sequence you move
 * through with prev/next, mirroring the web `course-player.tsx`. Picking a
 * lesson happens in `LessonPickerSheet`, a bottom sheet summoned by a
 * "Lessons" row rather than a permanent list above the player; what's picked
 * is then viewed through a four-way About/Notices/Routine/Discussion `Tabs`.
 * The stats row is `StatCard`s.
 *
 * The sheet and the lesson body itself live beside this file — `lesson-picker-sheet.tsx`
 * and `lecture-body.tsx` — because both are a screenful on their own.
 */

/**
 * The chunked tracker from DESIGN.md: one block per lecture, `accent` for done
 * and `chip-active` for the track, with the current lecture a third colour.
 * A single thin bar is explicitly not what this design asks for.
 */
function ChunkedProgress({
  completedIds,
  currentLectureId,
  lectures
}: {
  completedIds: ReadonlySet<string>;
  currentLectureId: string | null;
  lectures: readonly ContentLecture[];
}): JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.chunkRow}>
      {lectures.map((lecture) => (
        <View
          key={lecture.id}
          style={[
            styles.chunk,
            completedIds.has(lecture.id) ? styles.chunkDone : null,
            lecture.id === currentLectureId ? styles.chunkCurrent : null
          ]}
        />
      ))}
    </View>
  );
}

export default function CoursePlayerScreen(): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT();
  const format = useFormat();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<"about" | "discussion" | "notices" | "routine">(
    "about"
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hasJustCompletedCourse, setHasJustCompletedCourse] = useState(false);
  const recordStudyActivity = useRecordStudyActivity();

  const [courseQuery, contentQuery, progressQuery, testsQuery, noticesQuery] = useQueries({
    queries: [
      { queryFn: () => getCourse(courseId), queryKey: queryKeys.course(courseId) },
      { queryFn: () => getCourseContent(courseId), queryKey: queryKeys.courseContent(courseId) },
      { queryFn: () => getCourseProgress(courseId), queryKey: queryKeys.courseProgress(courseId) },
      { queryFn: () => getCourseAssessments(courseId), queryKey: queryKeys.courseTests(courseId) },
      { queryFn: () => listCourseNotices(courseId), queryKey: queryKeys.courseNotices(courseId) }
    ]
  });

  const course = courseQuery?.data ?? null;
  const chapters = contentQuery?.data ?? [];
  const progress = progressQuery?.data ?? null;
  const assessments = testsQuery?.data ?? [];
  const notices = noticesQuery?.data ?? [];
  const isLoading =
    Boolean(courseQuery?.isPending) ||
    Boolean(contentQuery?.isPending) ||
    Boolean(progressQuery?.isPending);
  // A course this student is not enrolled in answers 403, and the screen below
  // would then draw an empty player -- a title, no chapters, nothing to press.
  // Send them back to their courses instead. ADR-0001: the enrolment is the
  // access, and they do not have one.
  const isDenied = [courseQuery?.error, contentQuery?.error, progressQuery?.error].some(
    (error) => error instanceof ApiError && (error.status === 403 || error.status === 404)
  );

  useEffect(() => {
    if (isDenied) {
      router.replace("/(tabs)");
    }
  }, [isDenied, router]);

  // Opening a lecture is the one unambiguous "studied today" signal this
  // screen has — idempotent per day, so firing on every mount is fine.
  useEffect(() => {
    if (course !== null) {
      recordStudyActivity();
    }
  }, [course, recordStudyActivity]);

  const lectures = useMemo(() => chapters.flatMap((chapter) => chapter.lectures), [chapters]);
  const completedIds = useMemo(
    () =>
      new Set(
        (progress?.lectures ?? [])
          .filter((lecture) => lecture.isCompleted)
          .map((lecture) => lecture.lectureId)
      ),
    [progress?.lectures]
  );
  // Deliberately does not promote, mirroring the API: completion is caused by
  // the student finishing every lecture, never inferred while progress is
  // still loading. ADR-0005.
  const isCourseCompleted =
    progress !== null &&
    progress.totalLectures > 0 &&
    progress.completedLectures === progress.totalLectures;

  const testsByChapterId = useMemo(
    () => new Map(assessments.map((chapter) => [chapter.chapterId, chapter.tests] as const)),
    [assessments]
  );

  const navigationItems = useMemo(() => {
    const items: NavigationItem[] = [];

    for (const chapter of chapters) {
      const chapterItems: NavigationItem[] = chapter.lectures.map((lecture) => ({
        chapterId: chapter.id,
        id: `lecture:${lecture.id}`,
        kind: "lecture",
        lecture,
        sortOrder: lecture.sortOrder,
        title: lecture.title
      }));

      chapterItems.push(
        ...(testsByChapterId.get(chapter.id) ?? []).map((test) => ({
          chapterId: chapter.id,
          id: `test:${test.id}`,
          kind: "test" as const,
          sortOrder: test.sortOrder,
          test,
          title: test.title
        }))
      );
      chapterItems.sort((first, second) => first.sortOrder - second.sortOrder);
      items.push(...chapterItems);
    }

    return items;
  }, [chapters, testsByChapterId]);

  const selectedItem = navigationItems.find((item) => item.id === selectedItemId) ?? null;
  const selectedLecture = selectedItem?.kind === "lecture" ? selectedItem.lecture : null;
  const selectedChapter = selectedItem
    ? (chapters.find((chapter) => chapter.id === selectedItem.chapterId) ?? null)
    : null;
  const selectedIndex = navigationItems.findIndex((item) => item.id === selectedItemId);
  const selectedLectureProgress =
    progress?.lectures.find((lecture) => lecture.lectureId === selectedLecture?.id) ?? null;

  useEffect(() => {
    if (navigationItems.length === 0 || selectedItemId !== null) {
      return;
    }

    const firstId =
      progress?.nextLectureId &&
      navigationItems.some((item) => item.id === `lecture:${progress.nextLectureId}`)
        ? `lecture:${progress.nextLectureId}`
        : (navigationItems[0]?.id ?? null);

    setSelectedItemId(firstId);
  }, [navigationItems, progress?.nextLectureId, selectedItemId]);

  useEffect(() => {
    if (selectedItem) {
      setOpenChapterId(selectedItem.chapterId);
    }
  }, [selectedItem]);

  const complete = useMutation({
    mutationFn: markLectureComplete,
    onSuccess: async (next) => {
      // The lesson that finishes the course is the only one worth a
      // celebration, and the server is the one that decides a course is
      // finished — read the transition off its answer rather than counting
      // lectures here. ADR-0005.
      if (progress?.enrollmentStatus !== "COMPLETED" && next.enrollmentStatus === "COMPLETED") {
        setHasJustCompletedCourse(true);
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.courseProgress(courseId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.enrollments() });
    }
  });

  // Switching lessons always lands on "About" — staying on, say, Discussion
  // would show either the previous lecture's thread or nothing, neither of
  // which is what picking a new lesson means.
  const selectItem = (itemId: string | null): void => {
    setSelectedItemId(itemId);
    setContentTab("about");
  };

  const goToIndex = (index: number): void => {
    selectItem(navigationItems[index]?.id ?? null);
  };

  if (isLoading) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={28} width="60%" />
          <SkeletonBlock height={14} />
          <SkeletonBlock height={90} />
          <SkeletonBlock height={10} />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={60} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: course?.title ?? t("player.navigator") }} />
      <ScrollView contentContainerStyle={styles.content}>
        {hasJustCompletedCourse ? (
          <CourseCompletionNotice onDismiss={() => setHasJustCompletedCourse(false)} />
        ) : null}

        <Card>
          <View style={styles.badgesRow}>
            {course?.category ? <Badge>{course.category.name}</Badge> : null}
            <Badge tone={isCourseCompleted ? "neutral" : "quiet"}>
              {isCourseCompleted ? t("player.courseCompleted") : t("player.inProgress")}
            </Badge>
          </View>
          <View style={{ height: spacing.md }} />
          <Heading>{course?.title}</Heading>
          {course?.description ? <View style={{ height: spacing.sm }} /> : null}
          {course?.description ? <Body muted>{course.description}</Body> : null}
          <View style={[styles.statsRow, { paddingTop: spacing.lg }]}>
            <StatCard label={t("player.completed")} value={progress?.completedLectures ?? 0} />
            <StatCard
              label={t("player.lectures")}
              value={progress?.totalLectures ?? lectures.length}
            />
            <StatCard
              label={t("mine.progress")}
              value={format.percent(progress?.completionPercentage ?? 0)}
            />
            <StatCard
              label={t("player.assessments")}
              value={assessments.reduce((sum, chapter) => sum + chapter.tests.length, 0)}
            />
          </View>
          {lectures.length > 0 ? (
            <ChunkedProgress
              completedIds={completedIds}
              currentLectureId={selectedLecture?.id ?? null}
              lectures={lectures}
            />
          ) : null}
        </Card>

        <Pressable
          accessibilityLabel={t("player.lessonsAndTests")}
          accessibilityRole="button"
          onPress={() => setIsPickerOpen(true)}
          style={({ pressed }) => [pressed ? { opacity: 0.85 } : null]}
        >
          <Card>
            <View style={styles.lessonsTriggerRow}>
              <View style={styles.lessonsTriggerText}>
                <Caption tone="faint">{t("player.lessonsAndTests")}</Caption>
                <Body numberOfLines={1}>{selectedItem?.title ?? t("player.noLectures")}</Body>
              </View>
              <View style={styles.chevronWrap}>
                <Ionicons color={colors.mutedFaint} name="chevron-forward" size={16} />
              </View>
            </View>
          </Card>
        </Pressable>

        <Tabs
          label={t("player.navigator")}
          onChange={setContentTab}
          tabs={[
            { isActive: contentTab === "about", label: t("player.about"), value: "about" },
            { isActive: contentTab === "notices", label: t("player.notices"), value: "notices" },
            { isActive: contentTab === "routine", label: t("player.routine"), value: "routine" },
            { isActive: contentTab === "discussion", label: t("disc.title"), value: "discussion" }
          ]}
          value={contentTab}
        />

        {contentTab === "notices" ? (
          notices.length === 0 ? (
            <EmptyState message={t("player.noNotices")} title="" />
          ) : (
            notices.map((notice) => (
              <Card key={notice.id} style={{ gap: spacing.sm }}>
                <View style={styles.noticeHeader}>
                  <Body>{notice.title}</Body>
                  {notice.isPinned ? <Badge tone="attention">{t("player.pinned")}</Badge> : null}
                </View>
                <Body muted>{notice.content}</Body>
                <Caption>
                  {notice.author.name} · {format.date(notice.createdAt)}
                </Caption>
              </Card>
            ))
          )
        ) : null}

        {contentTab === "routine" ? <CourseRoutinePanel courseId={courseId} /> : null}

        {contentTab === "about" && selectedLecture !== null && selectedChapter !== null ? (
          <Card style={{ gap: spacing.md }}>
            <View style={styles.badgesRow}>
              <Badge>
                {completedIds.has(selectedLecture.id)
                  ? t("player.watchedDone")
                  : t("player.activeLecture")}
              </Badge>
              <Badge tone="quiet">
                {getPdfMaterial(selectedLecture) !== null
                  ? "PDF"
                  : selectedLecture.type === "TEXT"
                    ? "TEXT"
                    : "▶"}
              </Badge>
            </View>
            <Title>{selectedLecture.title}</Title>
            <Caption>
              {selectedChapter.title}
              {selectedLecture.videoDuration
                ? ` · ${t("course.minutes", { count: selectedLecture.videoDuration })}`
                : ""}
            </Caption>
            <LectureBody
              courseId={courseId}
              isCompleted={completedIds.has(selectedLecture.id)}
              isMarking={complete.isPending}
              lastViewedAt={selectedLectureProgress?.lastViewedAt ?? null}
              lecture={selectedLecture}
              onMarkComplete={() => complete.mutate(selectedLecture.id)}
            />
          </Card>
        ) : null}

        {contentTab === "about" && selectedItem?.kind === "test" ? (
          <Card style={{ gap: spacing.md }}>
            <View style={styles.badgesRow}>
              <Badge>{t("player.assessment")}</Badge>
              <Badge tone="quiet">{selectedItem.test.type}</Badge>
            </View>
            <Title>{selectedItem.test.title}</Title>
            <Caption>
              {t("player.questionCount", { count: selectedItem.test.questionCount })} ·{" "}
              {t("player.totalMarks", { count: selectedItem.test.totalMarks })} ·{" "}
              {selectedItem.test.durationInMinutes
                ? t("course.minutes", { count: selectedItem.test.durationInMinutes })
                : t("player.untimed")}
              {selectedItem.test.maxAttempts !== null
                ? ` · ${t("test.attemptsRemaining", { count: selectedItem.test.attemptsRemaining ?? selectedItem.test.maxAttempts })}`
                : ""}
            </Caption>
            {selectedItem.test.attemptsRemaining === 0 ? (
              <Caption tone="error">{t("test.attemptsExhausted")}</Caption>
            ) : null}
            <View style={styles.badgesRow}>
              <Button
                disabled={selectedItem.test.attemptsRemaining === 0}
                label={t("player.openTest")}
                onPress={() =>
                  router.push({
                    params: { testId: selectedItem.test.id },
                    pathname: "/tests/[testId]"
                  })
                }
              />
              {selectedItem.test.attemptsUsed ? (
                <Button
                  label={t("test.viewHistory")}
                  variant="outline"
                  onPress={() =>
                    router.push({
                      params: { testId: selectedItem.test.id },
                      pathname: "/tests/[testId]/history"
                    })
                  }
                />
              ) : null}
            </View>
          </Card>
        ) : null}

        {navigationItems.length === 0 ? (
          <EmptyState
            message={course?.isExamOnly ? t("player.examOnlyLead") : t("player.noLecturesLead")}
            title={t("player.noLectures")}
          />
        ) : null}

        {contentTab === "about" && selectedLecture !== null && selectedChapter !== null ? (
          <>
            <MaterialLinks
              materials={selectedLecture.materials}
              title={t("player.lectureMaterials")}
            />
            <MaterialLinks
              materials={selectedChapter.materials}
              title={t("player.chapterMaterials")}
            />
          </>
        ) : null}

        {contentTab === "discussion" ? (
          selectedLecture !== null ? (
            <LectureComments lectureId={selectedLecture.id} />
          ) : (
            <EmptyState message={t("player.discussionUnavailable")} title="" />
          )
        ) : null}

        {selectedItem !== null ? (
          <View style={styles.prevNext}>
            <Button
              disabled={selectedIndex <= 0}
              label={t("common.previous")}
              onPress={() => goToIndex(selectedIndex - 1)}
              variant="outline"
            />
            <Button
              disabled={selectedIndex === -1 || selectedIndex >= navigationItems.length - 1}
              label={t("common.next")}
              onPress={() => goToIndex(selectedIndex + 1)}
            />
          </View>
        ) : null}
      </ScrollView>

      <LessonPickerSheet
        chapters={chapters}
        completedIds={completedIds}
        navigationItems={navigationItems}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(itemId) => {
          selectItem(itemId);
          setIsPickerOpen(false);
        }}
        onToggleChapter={(chapterId) =>
          setOpenChapterId((current) =>
            current === chapterId && selectedItem?.chapterId !== chapterId ? null : chapterId
          )
        }
        openChapterId={openChapterId}
        selectedItemId={selectedItemId}
        visible={isPickerOpen}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  badgesRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chevronWrap: {
    alignItems: "center",
    backgroundColor: colors.panelWarm,
    borderRadius: radius.full,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  chunk: {
    backgroundColor: colors.chipActive,
    borderRadius: radius.full,
    flex: 1,
    height: 8,
    minWidth: 6
  },
  chunkCurrent: { backgroundColor: colors.brandGold },
  chunkDone: { backgroundColor: colors.accent },
  chunkRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  content: { gap: spacing.md, padding: spacing.lg },
  lessonsTriggerRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  lessonsTriggerText: { flex: 1, gap: 2 },
  noticeHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  prevNext: { flexDirection: "row", gap: spacing.md },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
