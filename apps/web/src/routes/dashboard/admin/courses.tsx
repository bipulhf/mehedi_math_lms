import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Layers3, CheckCircle2, XCircle, MessageSquareText, ShieldAlert, GraduationCap } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseSummary } from "@/lib/api/courses";
import { approveCourse, listCourses, rejectCourse } from "@/lib/api/courses";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/courses")({
  component: AdminCoursesPage,
  errorComponent: RouteErrorView
} as never);

function AdminCoursesPage(): JSX.Element {
  const t = useT();

  const queryClient = useQueryClient();
  const [feedbackByCourseId, setFeedbackByCourseId] = useState<Record<string, string>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);
  const pendingFilters = { limit: 12, page: 1, status: "PENDING" } as const;
  const { data, isPending: isLoading } = useQuery({
    queryFn: async () => listCourses({ ...pendingFilters }),
    queryKey: queryKeys.admin.courses(pendingFilters)
  });
  const courses: readonly CourseSummary[] = data?.data ?? [];

  const loadCourses = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.courses(pendingFilters) });
  };

  const handleApprove = async (courseId: string): Promise<void> => {
    setActioningId(courseId);
    try {
      await approveCourse(courseId);
      toast.success(t("admin.approve.approved"));
      await loadCourses();
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (courseId: string): Promise<void> => {
    const feedback = feedbackByCourseId[courseId]?.trim() ?? "";

    if (feedback.length < 8) {
      toast.error(t("admin.approve.needFeedback"));
      return;
    }

    setActioningId(courseId);
    try {
      await rejectCourse(courseId, { feedback });
      toast.success(t("admin.approve.sentBack"));
      await loadCourses();
    } finally {
      setActioningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-card/80 p-8 border border-hairline/40 relative w-full overflow-hidden">
          <Skeleton className="h-8 w-48 mb-4 bg-chip-active" />
          <Skeleton className="h-4 w-full max-w-sm bg-chip-active mb-8" />
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-4 bg-panel-warm/50 p-6 border border-hairline/10">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-24 rounded-full bg-chip-active" />
                  <Skeleton className="h-4 w-32 bg-chip-active" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4 bg-chip-active" />
                  <Skeleton className="h-4 w-full bg-chip-active" />
                </div>
                <Skeleton className="aspect-video w-full bg-chip-active" />
                <div className="flex gap-3 pt-2">
                  <Skeleton className="h-10 flex-1 bg-ink/20" />
                  <Skeleton className="h-10 flex-1 bg-chip-active" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-hairline bg-card p-6">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center border border-hairline bg-panel-warm">
              <ShieldAlert className="size-5" />
            </div>
            <h1 className="text-xl font-medium text-ink">{t("admin.approve.title")}</h1>
          </div>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-muted">
            Review pending academic proposals, curate high-quality content, and provide constructive feedback to fellow instructors.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">
            {courses.length} pending proposals
          </Badge>
          <Badge tone="neutral">{t("admin.approve.queue")}</Badge>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="border border-hairline bg-card/40 py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center border border-hairline bg-panel-warm">
            <CheckCircle2 className="size-8 text-muted-faint" />
          </div>
          <p className="text-lg font-medium text-ink">{t("admin.approve.emptyTitle")}</p>
          <p className="mx-auto max-w-xs text-sm font-light text-muted">{t("admin.approve.emptyLead")}</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {courses.map((course) => (
            <div 
              key={course.id} 
              className="flex flex-col border border-hairline bg-card p-5"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CourseStatusBadge status={course.status} />
                  <span className="text-xs text-muted-faint">
                    Received {course.submittedAt ? new Date(course.submittedAt).toLocaleDateString() : "Just now"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-medium text-ink">
                    {course.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="quiet">
                      <Layers3 className="mr-1 size-3 opacity-50" />
                      {course.category.name}
                    </Badge>
                    <Badge tone="quiet">
                      <GraduationCap className="mr-1 size-3 opacity-50" />
                      {course.isExamOnly ? "Assessment only" : "Comprehensive Course"}
                    </Badge>
                  </div>
                </div>

                {course.coverImageUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden border border-hairline bg-panel-warm">
                    <ResponsiveImage
                      alt={course.title}
                      className="h-full w-full object-cover"
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      src={course.coverImageUrl}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-3">
                      <p className="text-xs font-semibold text-white">Proposed by {course.creator.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center border border-hairline bg-panel-warm text-xs italic text-muted-faint">{t("admin.approve.noCover")}</div>
                )}

                <p className="line-clamp-2 border-l-2 border-hairline pl-3 text-sm font-light italic text-muted">
                  &ldquo;{course.description}&rdquo;
                </p>

                <div className="space-y-3 border border-hairline bg-panel-warm/40 p-4">
                  <div className="space-y-1">
                    <Label htmlFor={`feedback-${course.id}`}>{t("admin.approve.feedback")}</Label>
                    <div className="relative">
                      <Textarea
                        className="pl-9 text-sm"
                        id={`feedback-${course.id}`}
                        onChange={(event) =>
                          setFeedbackByCourseId((currentValues) => ({
                            ...currentValues,
                            [course.id]: event.target.value
                          }))
                        }
                        placeholder={t("admin.approve.feedbackPlaceholder")}
                        rows={2}
                        value={feedbackByCourseId[course.id] ?? ""}
                      />
                      <MessageSquareText className="absolute left-3 top-3 size-4 text-muted-faint" />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button 
                      className="flex-1"
                      disabled={actioningId === course.id}
                      onClick={() => void handleApprove(course.id)}
                    >
                      {actioningId === course.id ? (
                        <Skeleton className="h-4 w-12 bg-white/20" />
                      ) : (
                        <>
                          <CheckCircle2 className="mr-1.5 size-4" />{t("admin.approve.approve")}
                        </>
                      )}
                    </Button>
                    <Button 
                      className="flex-1"
                      disabled={actioningId === course.id}
                      onClick={() => void handleReject(course.id)}
                      variant="outline"
                    >
                      {actioningId === course.id ? (
                        <Skeleton className="h-4 w-12 bg-ink/10" />
                      ) : (
                        <>
                          <XCircle className="mr-1.5 size-4 text-error" />{t("admin.approve.reject")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
