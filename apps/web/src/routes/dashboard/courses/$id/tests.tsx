import { useQueries, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { TestBuilderSkeleton } from "@/components/common/skeletons";
import { ArchivedCourseBanner } from "@/components/courses/archived-course-banner";
import { CourseBuilderSteps } from "@/components/courses/course-builder-steps";
import { BackButton } from "@/components/ui/back-button";
import { RouteErrorView } from "@/components/common/route-error";
import { AssessmentBuilder } from "@/components/tests/assessment-builder";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import type { AssessmentChapterSummary } from "@/lib/api/tests";
import { getCourseAssessments } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dashboard/courses/$id/tests")({
  head: () =>
    seo({
      description: "Build and manage the tests attached to this course.",
      path: "/dashboard/courses",
      title: "Course Tests"
    }),
  component: CourseAssessmentsPage,
  errorComponent: RouteErrorView
} as never);

function CourseAssessmentsPage(): JSX.Element {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [courseQuery, assessmentsQuery] = useQueries({
    queries: [
      { queryFn: async () => getCourse(id), queryKey: queryKeys.courses.detail(id) },
      { queryFn: async () => getCourseAssessments(id), queryKey: queryKeys.tests.byCourse(id) }
    ]
  });
  const course: CourseDetail | null = courseQuery?.data ?? null;
  const assessments: readonly AssessmentChapterSummary[] = assessmentsQuery?.data ?? [];
  const isLoading = Boolean(courseQuery?.isPending) || Boolean(assessmentsQuery?.isPending);

  const loadData = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.tests.byCourse(id) });
  };

  if (isLoading || !course) {
    return <TestBuilderSkeleton />;
  }

  return (
    <div className="space-y-8">
      <BackButton to="/dashboard/courses" />
      {course.status === "ARCHIVED" ? <ArchivedCourseBanner /> : null}
      <CourseBuilderSteps courseId={id} current="lectures" />
      <AssessmentBuilder assessments={assessments} course={course} onRefresh={loadData} />
    </div>
  );
}
