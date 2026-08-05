import { Navigate, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";


import { useQueries } from "@tanstack/react-query";

import {
  CoursePlayer,
  CoursePlayerSkeleton
} from "@/components/courses/course-player";
import { RouteErrorView } from "@/components/common/route-error";
import { useAccessGuard } from "@/hooks/use-access-guard";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import type { ContentChapter } from "@/lib/api/content";
import { getCourseContent } from "@/lib/api/content";
import {
  getCourseProgress,
  type CourseProgressResponse
} from "@/lib/api/progress";
import type { AssessmentChapterSummary } from "@/lib/api/tests";
import { getCourseAssessments } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dashboard/learn/$courseId")({
  head: () =>
    seo({
      description: "Watch classes, track progress, and take tests for this course.",
      path: "/dashboard/learn",
      title: "Course Player"
    }),
  component: CourseLearningPage,
  errorComponent: RouteErrorView
} as never);

function CourseLearningPage(): JSX.Element {
  const { courseId } = Route.useParams();
  const { isPending: isSessionPending, session } = useAuthSession();
  const isStudent = !isSessionPending && session?.session.role === "STUDENT";
  const [courseQuery, contentQuery, progressQuery, assessmentsQuery] = useQueries({
    queries: [
      {
        enabled: isStudent,
        queryFn: async () => getCourse(courseId),
        queryKey: queryKeys.courses.detail(courseId)
      },
      {
        enabled: isStudent,
        queryFn: async () => getCourseContent(courseId),
        queryKey: queryKeys.content.course(courseId)
      },
      {
        enabled: isStudent,
        queryFn: async () => getCourseProgress(courseId),
        queryKey: queryKeys.progress.course(courseId)
      },
      {
        enabled: isStudent,
        queryFn: async () => getCourseAssessments(courseId),
        queryKey: queryKeys.tests.byCourse(courseId)
      }
    ]
  });
  // A course this student is not enrolled in answers 403 on its content, and
  // the page below renders a skeleton until content arrives — so without this
  // they would sit on a player that never loads. ADR-0001: the enrolment is the
  // access, and they do not have one.
  useAccessGuard([
    courseQuery?.error ?? null,
    contentQuery?.error ?? null,
    progressQuery?.error ?? null
  ]);

  const course: CourseDetail | null = courseQuery?.data ?? null;
  const content: readonly ContentChapter[] = contentQuery?.data ?? [];
  const progress: CourseProgressResponse | null = progressQuery?.data ?? null;
  const assessments: readonly AssessmentChapterSummary[] = assessmentsQuery?.data ?? [];
  // A non-student never enables the queries, so they would stay pending forever.
  const isLoading =
    isStudent &&
    (Boolean(courseQuery?.isPending) ||
      Boolean(contentQuery?.isPending) ||
      Boolean(progressQuery?.isPending) ||
      Boolean(assessmentsQuery?.isPending));

  // Staff have no player: they read a course through the builder. Their own
  // dashboard is a better answer than a card telling them to switch accounts.
  if (!isSessionPending && session !== null && session.session.role !== "STUDENT") {
    return <Navigate replace to="/dashboard" />;
  }

  if (isSessionPending || isLoading || !course || !progress) {
    return <CoursePlayerSkeleton />;
  }

  return (
    <CoursePlayer
      assessments={assessments}
      content={content}
      course={course}
      initialProgress={progress}
    />
  );
}
