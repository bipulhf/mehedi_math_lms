import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CourseReviews } from "@/src/components/course-reviews";
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  CoverImage,
  ErrorNotice,
  Heading,
  Screen,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { getCourse, getCourseContent, getMyCourseEnrollment } from "@/src/lib/api";
import { startCheckout } from "@/src/lib/payment";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

export default function CourseDetailScreen(): JSX.Element {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const isStudent = session?.session.role === "STUDENT";
  const [error, setError] = useState<string | null>(null);

  const [courseQuery, contentQuery, enrollmentQuery] = useQueries({
    queries: [
      { queryFn: async () => getCourse(courseId), queryKey: queryKeys.course(courseId) },
      {
        queryFn: async () => getCourseContent(courseId),
        queryKey: queryKeys.courseContent(courseId)
      },
      {
        enabled: isStudent,
        queryFn: async () => getMyCourseEnrollment(courseId),
        queryKey: queryKeys.enrollment(courseId)
      }
    ]
  });

  const course = courseQuery?.data ?? null;
  const chapters = contentQuery?.data ?? [];
  const enrollment = enrollmentQuery?.data ?? null;
  const hasAccess = Boolean(enrollment?.accessGranted);

  const enrol = useMutation({
    mutationFn: async () => startCheckout(courseId),
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    },
    onSuccess: async (outcome) => {
      if (outcome.kind === "cancelled") {
        // No banner. The student is back on this page with the enrol button
        // still available, which is the whole of what cancelling means.
        return;
      }

      if (outcome.kind === "failed") {
        setError(outcome.reason);

        return;
      }

      // A priced course has no enrolment until the gateway settles, so access
      // is re-read from the server rather than assumed from the redirect.
      await queryClient.invalidateQueries({ queryKey: queryKeys.enrollment(courseId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.enrollments() });
      router.push({ params: { courseId }, pathname: "/learn/[courseId]" });
    }
  });

  if (courseQuery?.isPending) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={200} />
          <SkeletonBlock height={28} width="70%" />
          <SkeletonBlock height={16} />
          <SkeletonBlock height={16} width="85%" />
        </ScrollView>
      </Screen>
    );
  }

  if (!course) {
    return (
      <Screen style={styles.padded}>
        <Title>Course not found</Title>
      </Screen>
    );
  }

  const isFree = Number(course.price) <= 0;
  const lectureCount = chapters.reduce((sum, chapter) => sum + chapter.lectures.length, 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: course.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <CoverImage height={200} uri={course.coverImageUrl} />
        <Heading>{course.title}</Heading>
        <View style={styles.metaRow}>
          <Badge>{isFree ? "Free" : `BDT ${Number(course.price).toLocaleString()}`}</Badge>
          {course.isExamOnly ? <Badge tone="warning">Exam only</Badge> : null}
          {course.category ? <Caption>{course.category.name}</Caption> : null}
        </View>
        <Body muted>{course.description}</Body>

        <Card>
          <Title>Taught by</Title>
          <View style={{ height: spacing.sm }} />
          {course.teachers.map((teacher) => (
            <Body key={teacher.id} muted>
              {teacher.name}
              {teacher.role === "OWNER" ? " · course owner" : ""}
            </Body>
          ))}
        </Card>

        <Card>
          <Title>{course.isExamOnly ? "Assessments" : `${lectureCount} lectures`}</Title>
          <View style={{ height: spacing.sm }} />
          {chapters.length === 0 ? (
            <Body muted>The outline is published with the course content.</Body>
          ) : (
            chapters.map((chapter) => (
              <View key={chapter.id} style={styles.chapter}>
                <Body>{chapter.title}</Body>
                <Caption>{chapter.lectures.length} lectures</Caption>
              </View>
            ))
          )}
        </Card>

        <CourseReviews canReview={hasAccess} courseId={courseId} />

        {error ? <ErrorNotice message={error} /> : null}

        {!isStudent ? (
          <Card>
            <Body muted>Enrolment is for student accounts.</Body>
          </Card>
        ) : hasAccess ? (
          <Button
            label="Continue learning"
            onPress={() => router.push({ params: { courseId }, pathname: "/learn/[courseId]" })}
          />
        ) : (
          <Button
            isBusy={enrol.isPending}
            label={isFree ? "Enrol for free" : "Enrol and pay"}
            onPress={() => enrol.mutate()}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chapter: { paddingVertical: spacing.xs },
  content: { gap: spacing.md, padding: spacing.lg },
  metaRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  padded: { padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
