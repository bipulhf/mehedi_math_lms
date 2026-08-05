import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { LectureComments } from "@/src/components/lecture-comments";
import { LecturePlayer } from "@/src/components/lecture-player";
import {
  AccordionRow,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  Heading,
  Screen,
  SkeletonBlock,
  StatCard,
  Tabs,
  Title
} from "@/src/components/ui";
import {
  getCourse,
  getCourseAssessments,
  getCourseContent,
  getCourseProgress,
  listCourseNotices,
  markLectureComplete,
  type AssessmentTestSummary,
  type ContentLecture
} from "@/src/lib/api";
import { ApiError } from "@/src/lib/api-client";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { colors, radius, spacing } from "@/src/theme/tokens";

/**
 * The course player. Lectures and tests are unified into one `sortOrder`-ordered
 * navigator so a class and its chapter's test are a single sequence you move
 * through with prev/next, mirroring the web `course-player.tsx`. Notices are a
 * mode toggle rather than an inline card, and the stats row is `StatCard`s.
 */

interface NavigationLectureItem {
  chapterId: string;
  id: string;
  kind: "lecture";
  lecture: ContentLecture;
  sortOrder: number;
  title: string;
}

interface NavigationTestItem {
  chapterId: string;
  id: string;
  kind: "test";
  sortOrder: number;
  test: AssessmentTestSummary;
  title: string;
}

type NavigationItem = NavigationLectureItem | NavigationTestItem;

function getPdfMaterial(lecture: ContentLecture) {
  return lecture.materials.find((material) => material.fileType === "application/pdf") ?? null;
}

function ChapterItem({
  isCompleted,
  isSelected,
  item,
  onSelect
}: {
  isCompleted: boolean;
  isSelected: boolean;
  item: NavigationItem;
  onSelect: () => void;
}): JSX.Element {
  const t = useT();

  return (
    <Pressable onPress={onSelect} style={[styles.itemRow, isSelected ? styles.itemRowActive : null]}>
      <View style={styles.itemRowText}>
        <Body numberOfLines={1}>{item.title}</Body>
        <Caption>
          {item.kind === "lecture"
            ? `${item.lecture.type === "TEXT" ? "" : "▶ "}${
                item.lecture.videoDuration
                  ? t("course.minutes", { count: item.lecture.videoDuration })
                  : t("player.selfPaced")
              }`
            : `${t("player.questionCount", { count: item.test.questionCount })} · ${t(
                "player.totalMarks",
                { count: item.test.totalMarks }
              )}`}
        </Caption>
      </View>
      <Caption>{item.kind === "test" ? "✦" : isCompleted ? "✓" : "○"}</Caption>
    </Pressable>
  );
}

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

function MaterialRow({
  fileType,
  fileUrl,
  title
}: {
  fileType: string;
  fileUrl: string;
  title: string;
}): JSX.Element {
  return (
    <Pressable
      onPress={() => {
        void WebBrowser.openBrowserAsync(fileUrl);
      }}
      style={styles.materialRow}
    >
      <View style={styles.materialText}>
        <Body numberOfLines={1}>{title}</Body>
        <Caption>{fileType}</Caption>
      </View>
      <Caption>↓</Caption>
    </Pressable>
  );
}

function MaterialLinks({
  materials,
  title
}: {
  materials: ContentLecture["materials"];
  title: string;
}): JSX.Element | null {
  if (materials.length === 0) {
    return null;
  }

  return (
    <Card>
      <Title>{title}</Title>
      <View style={{ height: spacing.sm }} />
      {materials.map((material) => (
        <MaterialRow
          fileType={material.fileType}
          fileUrl={material.fileUrl}
          key={material.id}
          title={material.title}
        />
      ))}
    </Card>
  );
}

export default function CoursePlayerScreen(): JSX.Element {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT();
  const format = useFormat();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [playerMode, setPlayerMode] = useState<"learn" | "notices">("learn");

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
      router.replace("/(tabs)/learning");
    }
  }, [isDenied, router]);

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

  useEffect(() => {
    if (navigationItems.length === 0 || selectedItemId !== null) {
      return;
    }

    const firstId =
      progress?.nextLectureId && navigationItems.some((item) => item.id === `lecture:${progress.nextLectureId}`)
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.courseProgress(courseId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.enrollments() });
    }
  });

  const goToIndex = (index: number): void => {
    setSelectedItemId(navigationItems[index]?.id ?? null);
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
        <Card>
          <View style={styles.badgesRow}>
            {course?.category ? <Badge>{course.category.name}</Badge> : null}
            <Badge tone={progress?.isCourseCompleted ? "neutral" : "quiet"}>
              {progress?.isCourseCompleted ? t("player.courseCompleted") : t("player.inProgress")}
            </Badge>
          </View>
          <View style={{ height: spacing.md }} />
          <Heading>{course?.title}</Heading>
          {course?.description ? (
            <View style={{ height: spacing.sm }} />
          ) : null}
          {course?.description ? <Body muted>{course.description}</Body> : null}
          <View style={[styles.statsRow, { paddingTop: spacing.lg }]}>
            <StatCard label={t("player.completed")} value={progress?.completedLectures ?? 0} />
            <StatCard label={t("player.lectures")} value={progress?.totalLectures ?? lectures.length} />
            <StatCard
              label={t("mine.progress")}
              value={format.percent(progress?.progressPercentage ?? 0)}
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
          <View style={{ height: spacing.lg }} />
          <Tabs
            label={t("player.navigator")}
            onChange={setPlayerMode}
            tabs={[
              { isActive: playerMode === "learn", label: t("player.lessonsAndTests"), value: "learn" },
              { isActive: playerMode === "notices", label: t("player.notices"), value: "notices" }
            ]}
            value={playerMode}
          />
        </Card>

        {playerMode === "notices" ? (
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

        {playerMode === "learn" ? (
          <Card>
            <Title>{t("player.navigator")}</Title>
            <View style={{ height: spacing.sm }} />
            {chapters.map((chapter) => {
              const chapterItems = navigationItems.filter((item) => item.chapterId === chapter.id);

              return (
                <AccordionRow
                  isOpen={openChapterId === chapter.id}
                  key={chapter.id}
                  meta={chapterItems.length}
                  onToggle={() =>
                    setOpenChapterId((current) =>
                      current === chapter.id && selectedItem?.chapterId !== chapter.id
                        ? null
                        : chapter.id
                    )
                  }
                  title={chapter.title}
                >
                  <View style={{ gap: spacing.xs }}>
                    {chapterItems.map((item) => (
                      <ChapterItem
                        isCompleted={
                          item.kind === "lecture" &&
                          Boolean(completedIds.has(item.lecture.id))
                        }
                        isSelected={selectedItemId === item.id}
                        item={item}
                        key={item.id}
                        onSelect={() => setSelectedItemId(item.id)}
                      />
                    ))}
                  </View>
                </AccordionRow>
              );
            })}
          </Card>
        ) : null}

        {playerMode === "learn" && selectedLecture !== null && selectedChapter !== null ? (
          <Card style={{ gap: spacing.md }}>
            <View style={styles.badgesRow}>
              <Badge>{completedIds.has(selectedLecture.id) ? t("player.watchedDone") : t("player.activeLecture")}</Badge>
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
              {selectedLecture.videoDuration ? ` · ${t("course.minutes", { count: selectedLecture.videoDuration })}` : ""}
            </Caption>
            <LectureBody
              isCompleted={completedIds.has(selectedLecture.id)}
              isMarking={complete.isPending}
              lecture={selectedLecture}
              onMarkComplete={() => complete.mutate(selectedLecture.id)}
            />
          </Card>
        ) : null}

        {playerMode === "learn" && selectedItem?.kind === "test" ? (
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
                  router.push({ params: { testId: selectedItem.test.id }, pathname: "/tests/[testId]" })
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

        {playerMode === "learn" && selectedLecture !== null && selectedChapter !== null ? (
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

        {selectedLecture !== null ? <LectureComments lectureId={selectedLecture.id} /> : null}

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
    </Screen>
  );
}

function LectureBody({
  isCompleted,
  isMarking,
  lecture,
  onMarkComplete
}: {
  isCompleted: boolean;
  isMarking: boolean;
  lecture: ContentLecture;
  onMarkComplete: () => void;
}): JSX.Element {
  const t = useT();
  const pdf = getPdfMaterial(lecture);

  return (
    <View style={styles.bodyStack}>
      {lecture.description ? (
        <View style={styles.panel}>
          <Body muted>{lecture.description}</Body>
        </View>
      ) : null}

      {pdf !== null ? (
        <View style={styles.panel}>
          <Body muted>{t("player.pdfLead")}</Body>
          <View style={{ height: spacing.md }} />
          <Button
            label={t("player.openPdf")}
            onPress={() => {
              void WebBrowser.openBrowserAsync(pdf.fileUrl);
            }}
            variant="outline"
          />
        </View>
      ) : lecture.type === "TEXT" ? (
        <Text style={styles.textContent}>{lecture.content ?? ""}</Text>
      ) : (
        <LecturePlayer
          isCompleted={isCompleted}
          onWatched={onMarkComplete}
          videoUrl={lecture.videoUrl}
        />
      )}

      <Button
        disabled={isCompleted}
        isBusy={isMarking}
        label={isCompleted ? t("player.watchedDone") : isMarking ? t("player.savingProgress") : t("player.watched")}
        onPress={onMarkComplete}
        variant={isCompleted ? "outline" : "ink"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badgesRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  bodyStack: { gap: spacing.md },
  chunk: {
    backgroundColor: colors.chipActive,
    borderRadius: radius.full,
    flex: 1,
    height: 8,
    minWidth: 6
  },
  chunkCurrent: { backgroundColor: colors.ink },
  chunkDone: { backgroundColor: colors.accent },
  chunkRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  content: { gap: spacing.md, padding: spacing.lg },
  itemRow: {
    alignItems: "center",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  itemRowActive: { backgroundColor: colors.chipActive },
  itemRowText: { flex: 1, gap: 2 },
  materialRow: {
    alignItems: "center",
    borderColor: colors.hairline,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md
  },
  materialText: { flex: 1, gap: 2 },
  noticeHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  panel: {
    backgroundColor: colors.panelWarm,
    padding: spacing.lg
  },
  prevNext: { flexDirection: "row", gap: spacing.md },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  textContent: {
    color: colors.ink,
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 16,
    lineHeight: 28,
    padding: spacing.lg
  }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";