import { useQueries, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { AssessmentBuilder } from "@/components/tests/assessment-builder";
import { Card, CardContent } from "@/components/ui/card";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import type { AssessmentChapterSummary } from "@/lib/api/tests";
import { getCourseAssessments } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";

export const Route = createFileRoute("/dashboard/courses/$id/tests")({
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
    return (
      <Card>
        <CardContent className="p-6 text-sm leading-6 text-on-surface/70">
          Loading assessment builder...
        </CardContent>
      </Card>
    );
  }

  return <AssessmentBuilder assessments={assessments} course={course} onRefresh={loadData} />;
}
