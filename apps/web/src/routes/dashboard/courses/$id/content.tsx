import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import {
  CourseContentBuilder,
  CourseContentBuilderSkeleton
} from "@/components/courses/course-content-builder";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import type { ContentChapter } from "@/lib/api/content";
import { getCourseContent } from "@/lib/api/content";

export const Route = createFileRoute("/dashboard/courses/$id/content" as never)({
  component: CourseContentPage,
  errorComponent: RouteErrorView
} as never);

function CourseContentPage(): JSX.Element {
  const { id } = Route.useParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [content, setContent] = useState<readonly ContentChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const [courseData, contentData] = await Promise.all([
        getCourse(id),
        getCourseContent(id)
      ]);
      setCourse(courseData);
      setContent(contentData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  if (isLoading || !course) {
    return <CourseContentBuilderSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="font-semibold text-on-surface">Assessment builder</p>
            <p className="text-sm leading-6 text-on-surface/70">
              Switch into timed tests, question banks, and submission review for this course.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard/courses/$id/tests" params={{ id: course.id }}>
              Open assessments
            </Link>
          </Button>
        </CardContent>
      </Card>
      <CourseContentBuilder content={content} course={course} onRefresh={loadData} />
    </div>
  );
}
