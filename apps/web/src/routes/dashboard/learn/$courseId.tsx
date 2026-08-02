import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";


import { useQueries } from "@tanstack/react-query";

import {
  CoursePlayer,
  CoursePlayerSkeleton
} from "@/components/courses/course-player";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/dashboard/learn/$courseId")({
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

  if (session?.session.role !== "STUDENT") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student access only</CardTitle>
          <CardDescription>
            The learning player is reserved for enrolled student accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-on-surface/68">
          Switch to a student account with course access to continue into the learning workspace.
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !course || !progress) {
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
