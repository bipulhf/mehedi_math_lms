import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CourseCard, CourseGridSkeleton } from "@/components/courses/course-card";
import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { CourseSummary } from "@/lib/api/courses";
import { archiveCourse, listCourses, submitCourse } from "@/lib/api/courses";

export const Route = createFileRoute("/dashboard/courses/" as never)({
  component: DashboardCoursesPage,
  errorComponent: RouteErrorView
} as never);

function DashboardCoursesPage(): JSX.Element {
  const [courses, setCourses] = useState<readonly CourseSummary[]>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadCourses = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await listCourses({
        limit: 12,
        mine: true,
        page: 1,
        status: status ? (status as CourseSummary["status"]) : undefined
      });
      setCourses(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, [status]);

  const handleSubmit = async (courseId: string): Promise<void> => {
    await submitCourse(courseId);
    toast.success("Course submitted for review");
    await loadCourses();
  };

  const handleArchive = async (courseId: string): Promise<void> => {
    if (!window.confirm("Archive this course?")) {
      return;
    }

    await archiveCourse(courseId);
    toast.success("Course archived");
    await loadCourses();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <CardTitle>My courses</CardTitle>
            <CardDescription>
              Build new drafts, revise rejected submissions, and push ready work into the admin approval queue.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-48 space-y-2">
              <Label htmlFor="course-status-filter">Status</Label>
              <Select
                id="course-status-filter"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </div>
            <Button asChild>
              <Link to="/dashboard/courses/new">Create course</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? <CourseGridSkeleton /> : null}

      {!isLoading && courses.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="font-semibold text-on-surface">No courses in this slice yet.</p>
            <p className="text-sm leading-6 text-on-surface/70">
              Start a fresh draft, then move through cover image, teacher assignment, and approval.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <CourseCard
                course={course}
                managementHref={{ params: { id: course.id }, to: "/dashboard/courses/$id/edit" }}
              />
              <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low p-5">
                <div className="flex items-center gap-3 text-sm text-on-surface/62">
                  <CourseStatusBadge status={course.status} />
                  <span>Updated {new Date(course.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {course.status !== "PENDING" && course.status !== "PUBLISHED" && course.status !== "ARCHIVED" ? (
                    <Button size="sm" type="button" onClick={() => void handleSubmit(course.id)}>
                      Submit
                    </Button>
                  ) : null}
                  {course.status !== "ARCHIVED" ? (
                    <Button size="sm" type="button" variant="outline" onClick={() => void handleArchive(course.id)}>
                      Archive
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
