import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { LectureComments } from "@/src/components/lecture-comments";
import { LecturePlayer } from "@/src/components/lecture-player";
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
import {
  getCourse,
  getCourseAssessments,
  getCourseContent,
  getCourseProgress,
  listCourseNotices,
  markLectureComplete,
  type ContentLecture
} from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { colors, radius, spacing } from "@/src/theme/tokens";

/**
 * The chunked tracker from DESIGN.md: one block per lecture, `secondary` for
 * done and `surface-container-highest` for the track. A single thin bar is
 * explicitly not what this design asks for.
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

export default function CoursePlayerScreen(): JSX.Element {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);

  const [courseQuery, contentQuery, progressQuery, testsQuery, noticesQuery] = useQueries({
    queries: [
      { queryFn: async () => getCourse(courseId), queryKey: queryKeys.course(courseId) },
      {
        queryFn: async () => getCourseContent(courseId),
        queryKey: queryKeys.courseContent(courseId)
      },
      {
        queryFn: async () => getCourseProgress(courseId),
        queryKey: queryKeys.courseProgress(courseId)
      },
      {
        queryFn: async () => getCourseAssessments(courseId),
        queryKey: queryKeys.courseTests(courseId)
      },
      {
        queryFn: async () => listCourseNotices(courseId),
        queryKey: queryKeys.courseNotices(courseId)
      }
    ]
  });

  const course = courseQuery?.data ?? null;
  const chapters = contentQuery?.data ?? [];
  const progress = progressQuery?.data ?? null;
  const assessments = testsQuery?.data ?? [];
  // Teachers post these; before this screen showed them, a mobile student only
  // learned about one if a push notification happened to fire.
  const notices = noticesQuery?.data ?? [];
  const isLoading =
    Boolean(courseQuery?.isPending) ||
    Boolean(contentQuery?.isPending) ||
    Boolean(progressQuery?.isPending);

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
  const activeLectureId = selectedLectureId ?? progress?.nextLectureId ?? lectures[0]?.id ?? null;
  const activeLecture = lectures.find((lecture) => lecture.id === activeLectureId) ?? null;

  const complete = useMutation({
    mutationFn: markLectureComplete,
    onSuccess: async () => {
      // Completion latches on the server; the client only re-reads it. ADR-0005.
      await queryClient.invalidateQueries({ queryKey: queryKeys.courseProgress(courseId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.enrollments() });
    }
  });

  if (isLoading) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={24} width="60%" />
          <SkeletonBlock height={10} />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={60} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: course?.title ?? "Course" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>{course?.title ?? "Course"}</Heading>

        {lectures.length > 0 ? (
          <>
            <ChunkedProgress
              completedIds={completedIds}
              currentLectureId={activeLectureId}
              lectures={lectures}
            />
            <Caption>
              {progress?.completedLectures ?? 0} of {progress?.totalLectures ?? lectures.length}{" "}
              lectures watched
            </Caption>
          </>
        ) : null}

        {progress?.isCourseCompleted ? <Badge tone="positive">Course completed</Badge> : null}

        {notices.length > 0 ? (
          <Card>
            <Title>Notices</Title>
            <View style={{ height: spacing.sm }} />
            {notices.map((notice) => (
              <View key={notice.id} style={styles.notice}>
                <View style={styles.noticeHeader}>
                  <Body>{notice.title}</Body>
                  {notice.isPinned ? <Badge>Pinned</Badge> : null}
                </View>
                <Body muted>{notice.content}</Body>
                <Caption>
                  {notice.author.name} · {new Date(notice.createdAt).toLocaleDateString()}
                </Caption>
              </View>
            ))}
          </Card>
        ) : null}

        {activeLecture ? (
          <Card>
            <Title>{activeLecture.title}</Title>
            <View style={{ height: spacing.sm }} />
            {activeLecture.description ? <Body muted>{activeLecture.description}</Body> : null}
            <View style={{ height: spacing.md }} />
            <LecturePlayer
              isCompleted={completedIds.has(activeLecture.id)}
              onWatched={() => complete.mutate(activeLecture.id)}
              videoUrl={activeLecture.videoUrl}
            />
            <View style={{ height: spacing.lg }} />
            {/* Still here even though playback marks the lecture itself: a
                reading, an external video, or a lecture the student skimmed
                all need a way to say "done", and completion latches on the
                server either way. ADR-0005. */}
            <Button
              disabled={completedIds.has(activeLecture.id)}
              isBusy={complete.isPending}
              label={completedIds.has(activeLecture.id) ? "Watched" : "Mark as watched"}
              onPress={() => complete.mutate(activeLecture.id)}
            />
          </Card>
        ) : (
          <EmptyState
            message={
              course?.isExamOnly
                ? "This is an exam-only course. Complete its tests below."
                : "The teacher has not published lectures yet."
            }
            title="No lectures"
          />
        )}

        {activeLecture ? <LectureComments lectureId={activeLecture.id} /> : null}

        {chapters.map((chapter) => (
          <Card key={chapter.id}>
            <Title>{chapter.title}</Title>
            <View style={{ height: spacing.sm }} />
            {chapter.lectures.map((lecture) => (
              <Pressable
                key={lecture.id}
                onPress={() => setSelectedLectureId(lecture.id)}
                style={[
                  styles.lectureRow,
                  lecture.id === activeLectureId ? styles.lectureRowActive : null
                ]}
              >
                <Body numberOfLines={1}>{lecture.title}</Body>
                {completedIds.has(lecture.id) ? <Caption>Watched</Caption> : null}
              </Pressable>
            ))}
          </Card>
        ))}

        {assessments.map((chapter) => (
          <Card key={chapter.chapterId}>
            <Title>{chapter.chapterTitle} — tests</Title>
            <View style={{ height: spacing.sm }} />
            {chapter.tests
              .filter((test) => test.isPublished)
              .map((test) => (
                <Pressable
                  key={test.id}
                  onPress={() =>
                    router.push({ params: { testId: test.id }, pathname: "/tests/[testId]" })
                  }
                  style={styles.lectureRow}
                >
                  <Body>{test.title}</Body>
                  <Caption>Open</Caption>
                </Pressable>
              ))}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chunk: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.full,
    flex: 1,
    height: 8,
    minWidth: 6
  },
  chunkCurrent: { backgroundColor: colors.primary },
  chunkDone: { backgroundColor: colors.secondary },
  chunkRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  content: { gap: spacing.md, padding: spacing.lg },
  lectureRow: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md
  },
  lectureRowActive: { backgroundColor: colors.secondaryContainer },
  notice: { gap: spacing.xs, paddingVertical: spacing.sm },
  noticeHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
