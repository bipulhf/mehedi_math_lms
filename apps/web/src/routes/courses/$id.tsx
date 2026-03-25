import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";

export const Route = createFileRoute("/courses/$id" as never)({
  component: CourseDetailPage,
  errorComponent: RouteErrorView
} as never);

function CourseDetailPage(): JSX.Element {
  const { id } = Route.useParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);

  useEffect(() => {
    void (async () => {
      const courseData = await getCourse(id);
      setCourse(courseData);
    })();
  }, [id]);

  if (!course) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10">
        <div className="aspect-16/7 animate-pulse rounded-(--radius) bg-surface-container-low" />
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="h-80 animate-pulse rounded-(--radius) bg-surface-container-low" />
          <div className="h-80 animate-pulse rounded-(--radius) bg-surface-container-low" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <FadeIn>
        <Card className="overflow-hidden">
          {course.coverImageUrl ? (
            <img
              alt={course.title}
              className="aspect-16/7 w-full object-cover"
              src={course.coverImageUrl}
            />
          ) : (
            <div className="aspect-16/7 w-full bg-[radial-gradient(circle_at_top_left,rgba(96,99,238,0.18),transparent_55%),linear-gradient(135deg,rgba(27,27,31,0.04),rgba(96,99,238,0.1))]" />
          )}
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <CourseStatusBadge status={course.status} />
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface">
                {course.category.name}
              </span>
              {course.isExamOnly ? (
                <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface">
                  Exam only
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] text-on-surface">
                {course.title}
              </h1>
              <p className="max-w-4xl text-base leading-7 text-on-surface/70">{course.description}</p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>Teaching team</CardTitle>
              <CardDescription>
                Meet the teachers responsible for this learning experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {course.teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4"
                >
                  <p className="font-semibold text-on-surface">{teacher.name}</p>
                  <p className="text-sm text-on-surface/62">{teacher.email}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delayClassName="animation-delay-100">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment frame</CardTitle>
              <CardDescription>
                The enrollment and full player experience arrive in the next project phase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                <p className="text-sm text-on-surface/62">Price</p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">
                  {Number(course.price) > 0 ? `BDT ${Number(course.price).toFixed(2)}` : "Free"}
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/auth/sign-in">Sign in to continue</Link>
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
