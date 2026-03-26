import { createFileRoute } from "@tanstack/react-router";
import { Layers3, CheckCircle2, XCircle, MessageSquareText, ShieldAlert, GraduationCap } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [actioningId, setActioningId] = useState<string | null>(null);

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
    setActioningId(courseId);
    try {
      await approveCourse(courseId);
      toast.success("Course approved and published");
      await loadCourses();
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (courseId: string): Promise<void> => {
    const feedback = feedbackByCourseId[courseId]?.trim() ?? "";

    if (feedback.length < 8) {
      toast.error("Add at least a short review note before rejecting");
      return;
    }

    setActioningId(courseId);
    try {
      await rejectCourse(courseId, { feedback });
      toast.success("Course sent back with feedback");
      await loadCourses();
    } finally {
      setActioningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
          <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
          <Skeleton className="h-4 w-full max-w-sm bg-surface-container-highest mb-8" />
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-4 rounded-4xl bg-surface-container-low/50 p-6 border border-outline-variant/10 shadow-sm">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-24 rounded-full bg-surface-container-highest" />
                  <Skeleton className="h-4 w-32 bg-surface-container-highest" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4 bg-surface-container-highest rounded-xl" />
                  <Skeleton className="h-4 w-full bg-surface-container-highest" />
                </div>
                <Skeleton className="aspect-video w-full rounded-2xl bg-surface-container-highest" />
                <div className="flex gap-3 pt-2">
                  <Skeleton className="h-10 flex-1 rounded-xl bg-primary/20" />
                  <Skeleton className="h-10 flex-1 rounded-xl bg-surface-container-highest" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-3">
             <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10">
                <ShieldAlert className="size-6" />
             </div>
             <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
              Approval workshop
            </h3>
          </div>
          <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
            Review pending academic proposals, curate high-quality content, and provide constructive feedback to fellow instructors.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Badge tone="violet" className="rounded-full px-5 py-2 font-bold text-[0.7rem] uppercase tracking-widest bg-violet-500/10 border-violet-500/20 shadow-sm">
            {courses.length} pending proposals
          </Badge>
          <Badge tone="green" className="rounded-full px-5 py-2 font-bold text-[0.7rem] uppercase tracking-widest bg-green-500/10 border-green-500/20 shadow-sm">
            Curated queue
          </Badge>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-4xl bg-surface-container-lowest/40 border border-dashed border-outline-variant/20 py-24 text-center group transition-all hover:bg-surface-container-lowest/60">
          <div className="size-24 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-outline-variant/10 group-hover:scale-105 transition-transform duration-500">
            <CheckCircle2 className="size-10 text-primary/20 group-hover:text-primary transition-colors" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-on-surface mb-2 tracking-tight">The workshop is quiet</p>
          <p className="text-sm text-on-surface-variant max-w-xs mx-auto font-light leading-relaxed">
            All academic proposals have been curated. Take a moment to breathe before the next surge.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {courses.map((course) => (
            <div 
              key={course.id} 
              className="group/card flex flex-col rounded-4xl border border-outline-variant/40 bg-surface-container-lowest/80 backdrop-blur-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:border-primary/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/2 rounded-full -mr-16 -mt-16 blur-2xl group-hover/card:bg-primary/5 transition-colors"></div>
              
              <div className="flex flex-col gap-6 relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <CourseStatusBadge status={course.status} />
                  <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/40 bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/10">
                    Received {course.submittedAt ? new Date(course.submittedAt).toLocaleDateString() : "Just now"}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight leading-tight group-hover/card:text-primary transition-colors">
                    {course.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone="gray" className="rounded-full border-outline-variant/30 text-[0.6rem] font-bold bg-surface-container-low text-on-surface-variant">
                      <Layers3 className="size-3 mr-1.5 opacity-50" />
                      {course.category.name}
                    </Badge>
                     <Badge tone="gray" className="rounded-full border-outline-variant/30 text-[0.6rem] font-bold bg-surface-container-low text-on-surface-variant">
                      <GraduationCap className="size-3 mr-1.5 opacity-50" />
                      {course.isExamOnly ? "Assessment only" : "Comprehensive Course"}
                    </Badge>
                  </div>
                </div>

                {course.coverImageUrl ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-low group-hover/card:shadow-lg transition-all duration-500">
                    <img
                      alt={course.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                      src={course.coverImageUrl}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-linear-to-t from-black/60 to-transparent">
                       <p className="text-[0.65rem] font-bold text-white uppercase tracking-widest opacity-80">Proposed by {course.creator.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-2xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-center italic text-xs text-on-surface/30">
                    No visual signifier provided
                  </div>
                )}

                <p className="text-sm leading-relaxed text-on-surface-variant font-light line-clamp-3 pl-4 border-l-2 border-primary/20 italic">
                  &ldquo;{course.description}&rdquo;
                </p>

                <div className="space-y-4 bg-primary/3 p-5 rounded-3xl border border-primary/5">
                  <div className="space-y-2">
                    <Label 
                      htmlFor={`feedback-${course.id}`}
                      className="text-[0.65rem] font-bold uppercase tracking-widest text-primary/60 pl-1"
                    >
                      Curatorial Feedback
                    </Label>
                    <div className="relative">
                      <Textarea
                        id={`feedback-${course.id}`}
                        placeholder="Detail the necessary refinements for publication..."
                        className="min-h-25 text-sm rounded-2xl bg-surface-container-low/80 border-outline-variant/30 font-body pl-10 focus:ring-primary/20 transition-all resize-none"
                        value={feedbackByCourseId[course.id] ?? ""}
                        onChange={(event) =>
                          setFeedbackByCourseId((currentValues) => ({
                            ...currentValues,
                            [course.id]: event.target.value
                          }))
                        }
                      />
                      <MessageSquareText className="absolute left-3.5 top-3.5 size-4 text-on-surface/30" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      className="h-11 flex-1 rounded-xl font-bold text-xs uppercase tracking-widest bg-primary hover:bg-primary-hover shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      onClick={() => void handleApprove(course.id)}
                      disabled={actioningId === course.id}
                    >
                      {actioningId === course.id ? (
                        <Skeleton className="h-4 w-12 bg-white/20" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4" />
                          Approve Proposals
                        </div>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-11 flex-1 rounded-xl font-bold text-xs uppercase tracking-widest border-outline-variant/30 hover:bg-surface-container-high transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      onClick={() => void handleReject(course.id)}
                      disabled={actioningId === course.id}
                    >
                      {actioningId === course.id ? (
                        <Skeleton className="h-4 w-12 bg-on-surface/10" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="size-4 text-red-500/60" />
                          Request Revision
                        </div>
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
