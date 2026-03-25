import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

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

export const Route = createFileRoute("/dashboard/learn/$courseId" as never)({
  component: CourseLearningPage,
  errorComponent: RouteErrorView
} as never);

function CourseLearningPage(): JSX.Element {
  const { courseId } = Route.useParams();
  const { isPending: isSessionPending, session } = useAuthSession();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [content, setContent] = useState<readonly ContentChapter[]>([]);
  const [assessments, setAssessments] = useState<readonly AssessmentChapterSummary[]>([]);
  const [progress, setProgress] = useState<CourseProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSessionPending) {
      return;
    }

    if (session?.session.role !== "STUDENT") {
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);

      try {
        const [courseData, contentData, progressData, assessmentData] = await Promise.all([
          getCourse(courseId),
          getCourseContent(courseId),
          getCourseProgress(courseId),
          getCourseAssessments(courseId)
        ]);
        setCourse(courseData);
        setContent(contentData);
        setProgress(progressData);
        setAssessments(assessmentData);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [courseId, isSessionPending, session]);

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
