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
    <div className="space-y-8">
      <div className="bg-card/80 p-8 sm:p-10 border border-hairline/40 relative w-full overflow-hidden group">
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-3">
             <div className="size-12 bg-ink/10 flex items-center justify-center text-ink border border-ink/10">
                <ShieldAlert className="size-6" />
             </div>
             <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("admin.approve.title")}</h3>
          </div>
          <p className="mt-2 text-sm text-muted font-light max-w-2xl leading-relaxed">
            Review pending academic proposals, curate high-quality content, and provide constructive feedback to fellow instructors.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Badge tone="neutral" className="rounded-full px-5 py-2 font-bold text-[0.7rem] uppercase tracking-widest bg-violet-500/10 border-violet-500/20">
            {courses.length} pending proposals
          </Badge>
          <Badge tone="neutral" className="rounded-full px-5 py-2 font-bold text-[0.7rem] uppercase tracking-widest bg-green-500/10 border-green-500/20">{t("admin.approve.queue")}</Badge>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bg-card/40 border border-dashed border-hairline/20 py-24 text-center group transition-all hover:bg-card/60">
          <div className="size-24 bg-panel-warm rounded-full flex items-center justify-center mx-auto mb-6 border border-hairline/10">
            <CheckCircle2 className="size-10 text-ink/20 group-hover:text-ink transition-colors" />
          </div>
          <p className="font-body text-2xl font-medium text-ink mb-2 tracking-tight">{t("admin.approve.emptyTitle")}</p>
          <p className="text-sm text-muted max-w-xs mx-auto font-light leading-relaxed">{t("admin.approve.emptyLead")}</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {courses.map((course) => (
            <div 
              key={course.id} 
              className="group/card flex flex-col border border-hairline/40 bg-card/80 p-6 transition-all hover:border-ink/20 relative overflow-hidden"
            >
              
              <div className="flex flex-col gap-6 relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <CourseStatusBadge status={course.status} />
                  <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-ink/40 bg-panel-warm px-3 py-1 rounded-full border border-hairline/10">
                    Received {course.submittedAt ? new Date(course.submittedAt).toLocaleDateString() : "Just now"}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-body text-2xl font-medium text-ink tracking-tight leading-tight group-hover/card:text-ink transition-colors">
                    {course.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone="quiet" className="rounded-full border-hairline/30 text-[0.6rem] font-bold bg-panel-warm text-muted">
                      <Layers3 className="size-3 mr-1.5 opacity-50" />
                      {course.category.name}
                    </Badge>
                     <Badge tone="quiet" className="rounded-full border-hairline/30 text-[0.6rem] font-bold bg-panel-warm text-muted">
                      <GraduationCap className="size-3 mr-1.5 opacity-50" />
                      {course.isExamOnly ? "Assessment only" : "Comprehensive Course"}
                    </Badge>
                  </div>
                </div>

                {course.coverImageUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden border border-hairline/20 bg-panel-warm group-hover/card: transition-all">
                    <ResponsiveImage
                      alt={course.title}
                      className="h-full w-full object-cover group-hover/card:scale-105"
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      src={course.coverImageUrl}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-linear-to-t from-black/60 to-transparent">
                       <p className="text-[0.65rem] font-bold text-white uppercase tracking-widest opacity-80">Proposed by {course.creator.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-panel-warm border border-hairline/10 flex items-center justify-center italic text-xs text-ink/30">{t("admin.approve.noCover")}</div>
                )}

                <p className="text-sm leading-relaxed text-muted font-light line-clamp-3 pl-4 border-l-2 border-ink/20 italic">
                  &ldquo;{course.description}&rdquo;
                </p>

                <div className="space-y-4 bg-ink/3 p-5 border border-ink/5">
                  <div className="space-y-2">
                    <Label 
                      htmlFor={`feedback-${course.id}`}
                      className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                    >{t("admin.approve.feedback")}</Label>
                    <div className="relative">
                      <Textarea
                        id={`feedback-${course.id}`}
                        placeholder={t("admin.approve.feedbackPlaceholder")}
                        className="min-h-25 text-sm bg-panel-warm/80 border-hairline/30 font-body pl-10 focus:ring-ink/20 transition-all resize-none"
                        value={feedbackByCourseId[course.id] ?? ""}
                        onChange={(event) =>
                          setFeedbackByCourseId((currentValues) => ({
                            ...currentValues,
                            [course.id]: event.target.value
                          }))
                        }
                      />
                      <MessageSquareText className="absolute left-3.5 top-3.5 size-4 text-ink/30" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      className="h-11 flex-1 font-bold text-xs uppercase tracking-widest bg-ink hover:bg-ink-muted transition-all disabled:opacity-50"
                      onClick={() => void handleApprove(course.id)}
                      disabled={actioningId === course.id}
                    >
                      {actioningId === course.id ? (
                        <Skeleton className="h-4 w-12 bg-white/20" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4" />{t("admin.approve.approve")}</div>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-11 flex-1 font-bold text-xs uppercase tracking-widest border-hairline/30 hover:bg-chip-active transition-all disabled:opacity-50"
                      onClick={() => void handleReject(course.id)}
                      disabled={actioningId === course.id}
                    >
                      {actioningId === course.id ? (
                        <Skeleton className="h-4 w-12 bg-ink/10" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="size-4 text-red-500/60" />{t("admin.approve.reject")}</div>
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
