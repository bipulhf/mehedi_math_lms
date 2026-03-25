import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CourseGridSkeleton } from "@/components/courses/course-card";
import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CourseSummary } from "@/lib/api/courses";
import { approveCourse, listCourses, rejectCourse } from "@/lib/api/courses";

export const Route = createFileRoute("/dashboard/admin/courses" as never)({
  component: AdminCoursesPage,
  errorComponent: RouteErrorView
} as never);

function AdminCoursesPage(): JSX.Element {
  const [courses, setCourses] = useState<readonly CourseSummary[]>([]);
  const [feedbackByCourseId, setFeedbackByCourseId] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadCourses = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await listCourses({
        limit: 12,
        page: 1,
        status: "PENDING"
      });
      setCourses(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  const handleApprove = async (courseId: string): Promise<void> => {
    await approveCourse(courseId);
    toast.success("Course approved");
    await loadCourses();
  };

  const handleReject = async (courseId: string): Promise<void> => {
    const feedback = feedbackByCourseId[courseId]?.trim() ?? "";

    if (feedback.length < 8) {
      toast.error("Add at least a short review note before rejecting");
      return;
    }

    await rejectCourse(courseId, { feedback });
    toast.success("Course sent back with feedback");
    await loadCourses();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Course approval queue</CardTitle>
          <CardDescription>
            Review pending drafts, publish the ready ones, and return the rest with precise feedback.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? <CourseGridSkeleton /> : null}

      {!isLoading && courses.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm leading-6 text-on-surface/70">
            The approval queue is clear right now.
          </CardContent>
        </Card>
      ) : null}

      {!isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CourseStatusBadge status={course.status} />
                  <p className="text-sm text-on-surface/62">
                    Submitted {course.submittedAt ? new Date(course.submittedAt).toLocaleDateString() : "just now"}
                  </p>
                </div>
                <div>
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  <CardDescription>
                    {course.category.name} • {course.creator.name} • {course.isExamOnly ? "Exam only" : "Full course"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.coverImageUrl ? (
                  <img
                    alt={course.title}
                    className="aspect-video w-full rounded-[calc(var(--radius)-0.125rem)] object-cover"
                    src={course.coverImageUrl}
                  />
                ) : null}
                <p className="text-sm leading-6 text-on-surface/70">{course.description}</p>
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm text-on-surface/70">
                  <p className="font-semibold text-on-surface">Teachers</p>
                  <p>{course.teachers.map((teacher) => teacher.name).join(", ")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`feedback-${course.id}`}>Rejection feedback</Label>
                  <Textarea
                    id={`feedback-${course.id}`}
                    placeholder="Tell the teacher what must be revised before publication."
                    value={feedbackByCourseId[course.id] ?? ""}
                    onChange={(event) =>
                      setFeedbackByCourseId((currentValues) => ({
                        ...currentValues,
                        [course.id]: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void handleApprove(course.id)}>
                    Approve
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void handleReject(course.id)}>
                    Reject with feedback
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
