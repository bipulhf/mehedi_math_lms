import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { FadeIn } from "@/components/common/fade-in";
import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CourseSummary } from "@/lib/api/courses";

export function CourseCard({
  course,
  managementHref
}: {
  course: CourseSummary;
  managementHref?: { params?: { id: string } | undefined; to: "/dashboard/courses/$id/edit" | "/dashboard/admin/courses" } | undefined;
}): JSX.Element {
  return (
    <FadeIn>
      <Card className="overflow-hidden">
        <div className="relative aspect-video overflow-hidden bg-surface-container-low">
          {course.coverImageUrl ? (
            <img
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-[1.02]"
              src={course.coverImageUrl}
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(96,99,238,0.18),transparent_55%),linear-gradient(135deg,rgba(27,27,31,0.04),rgba(96,99,238,0.1))]" />
          )}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <CourseStatusBadge status={course.status} />
            {course.isExamOnly ? <span className="rounded-full bg-surface/85 px-3 py-1 text-xs font-semibold text-on-surface">Exam only</span> : null}
          </div>
        </div>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-on-surface/45">{course.category.name}</p>
            <h3 className="font-display text-xl font-semibold text-on-surface">{course.title}</h3>
            <p className="line-clamp-3 text-sm leading-6 text-on-surface/70">{course.description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-on-surface/62">
            <span>{Number(course.price) > 0 ? `BDT ${Number(course.price).toFixed(2)}` : "Free"}</span>
            <span>{course.teachers.length} teacher{course.teachers.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/courses/$id" params={{ id: course.id }}>
                Open details
              </Link>
            </Button>
            {managementHref ? (
              <Button asChild size="sm" variant="outline">
                {"params" in managementHref && managementHref.params ? (
                  <Link to={managementHref.to} params={managementHref.params}>
                    Manage
                  </Link>
                ) : (
                  <Link to={managementHref.to}>
                    Manage
                  </Link>
                )}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

export function CourseGridSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <div className="aspect-video animate-pulse bg-surface-container-low" />
          <CardContent className="space-y-4 p-5">
            <div className="h-3 w-20 animate-pulse rounded-full bg-surface-container-low" />
            <div className="h-6 w-3/4 animate-pulse rounded-full bg-surface-container-low" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded-full bg-surface-container-low" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-surface-container-low" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface-container-low" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-28 animate-pulse rounded-full bg-surface-container-low" />
              <div className="h-10 w-24 animate-pulse rounded-full bg-surface-container-low" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
