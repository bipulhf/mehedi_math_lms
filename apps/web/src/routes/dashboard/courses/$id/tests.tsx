import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { AssessmentBuilder } from "@/components/tests/assessment-builder";
import { Card, CardContent } from "@/components/ui/card";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import type { AssessmentChapterSummary } from "@/lib/api/tests";
import { getCourseAssessments } from "@/lib/api/tests";

export const Route = createFileRoute("/dashboard/courses/$id/tests" as never)({
  component: CourseAssessmentsPage,
  errorComponent: RouteErrorView
} as never);

function CourseAssessmentsPage(): JSX.Element {
  const { id } = Route.useParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [assessments, setAssessments] = useState<readonly AssessmentChapterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const [courseData, assessmentData] = await Promise.all([
        getCourse(id),
        getCourseAssessments(id)
      ]);
      setCourse(courseData);
      setAssessments(assessmentData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

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
