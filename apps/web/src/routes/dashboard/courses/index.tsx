import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus, Filter, LayoutGrid, Archive, Send, BookOpen } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { CourseCard } from "@/components/courses/course-card";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseSummary } from "@/lib/api/courses";
import { listCourses, submitCourse, withdrawCourse } from "@/lib/api/courses";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/courses/")({
  component: DashboardCoursesPage,
  errorComponent: RouteErrorView
} as never);

function CourseListSkeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      <div className="bg-card/80 p-8 border border-hairline/40">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <Skeleton className="h-10 w-48 bg-chip-active" />
          <div className="flex gap-4 w-full sm:w-auto">
            <Skeleton className="h-12 w-full sm:w-40 bg-chip-active" />
            <Skeleton className="h-12 w-full sm:w-40 bg-ink/20" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-96 w-full bg-panel-warm/50 border border-hairline/10"
          />
        ))}
      </div>
    </div>
  );
}

function DashboardCoursesPage(): JSX.Element {
  const t = useT();

  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const mineFilters = { limit: 12, page: 1, status };
  const { data, isPending: isLoading } = useQuery({
    queryFn: async () =>
      listCourses({
        limit: 12,
        mine: true,
        page: 1,
        status: status ? (status as CourseSummary["status"]) : undefined
      }),
    queryKey: queryKeys.courses.mine(mineFilters)
  });
  const courses: readonly CourseSummary[] = data?.data ?? [];

  const loadCourses = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
  };

  const handleSubmit = async (courseId: string): Promise<void> => {
    await submitCourse(courseId);
    toast.success(t("tcourses.submitted"));
    await loadCourses();
  };

  const [archiveTarget, setArchiveTarget] = useState<CourseSummary | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const executeArchive = async (): Promise<void> => {
    if (!archiveTarget) {
      return;
    }

    setIsArchiving(true);
    try {
      await withdrawCourse(archiveTarget.id);
      toast.success(t("tcourses.archivedDone"));
      setArchiveTarget(null);
      await loadCourses();
    } finally {
      setIsArchiving(false);
    }
  };

  if (isLoading) return <CourseListSkeleton />;

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="bg-card/80 p-8 sm:p-10 border border-hairline/40 relative w-full overflow-hidden group">

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 bg-ink/10 flex items-center justify-center text-ink border border-ink/10">
              <LayoutGrid className="size-5" />
            </div>
            <h3 className="font-body text-2xl font-medium tracking-tight text-ink">{t("tcourses.title")}</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="min-w-48 space-y-2">
              <Label
                htmlFor="status-filter"
                className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40 ml-1"
              >{t("tcourses.statusFilter")}</Label>
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-ink/30 group-focus-within:text-ink transition-colors" />
                <Select
                  id="status-filter"
                  className="h-12 pl-11 bg-panel-warm/50 border-hairline/30 font-body transition-all hover:bg-panel-warm"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">{t("tcourses.allStates")}</option>
                  <option value="DRAFT">{t("tcourses.drafts")}</option>
                  <option value="PENDING">{t("tcourses.underReview")}</option>
                  <option value="PUBLISHED">{t("tcourses.live")}</option>
                  <option value="ARCHIVED">{t("tcourses.archived")}</option>
                </Select>
              </div>
            </div>
            <div className="sm:pt-6">
              <Button asChild>
                <Link to="/dashboard/courses/new" className="flex items-center gap-2">
                  <Plus className="size-4" />{t("tcourses.add")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bg-card/40 border border-dashed border-hairline/20 py-24 text-center group transition-all hover:bg-card/60">
          <div className="size-24 bg-panel-warm rounded-full flex items-center justify-center mx-auto mb-6 border border-hairline/10">
            <BookOpen className="size-10 text-ink/20 group-hover:text-ink transition-colors" />
          </div>
          <p className="font-body text-2xl font-medium text-ink mb-2 tracking-tight">{t("tcourses.empty")}</p>
          <p className="text-sm text-muted max-w-xs mx-auto font-light leading-relaxed italic">
            No courses in this category. Propose your first draft and start your instructional
            journey.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group/card flex flex-col border border-hairline/40 bg-card/80 overflow-hidden transition-all hover:border-ink/20 relative"
            >

              <CourseCard
                course={course}
                managementHref={{ params: { id: course.id }, to: "/dashboard/courses/$id/edit" }}
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-hairline/10 bg-ink/2 p-4 relative z-10">
                <div className="flex gap-2">
                  {course.status !== "PENDING" &&
                    course.status !== "PUBLISHED" &&
                    course.status !== "ARCHIVED" && (
                      <Button
                        size="sm"
                        onClick={() => void handleSubmit(course.id)}
                        className="h-10 px-5 font-bold text-[0.65rem] uppercase tracking-widest bg-ink hover:bg-ink-muted transition-all"
                      >
                        <Send className="size-3.5 mr-2" />{t("tcourses.submit")}</Button>
                    )}
                  {course.status !== "ARCHIVED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setArchiveTarget(course)}
                      className="h-10 px-5 font-bold text-[0.65rem] uppercase tracking-widest border-hairline/40 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all font-body"
                    >
                      <Archive className="size-3.5 mr-2" />{t("tcourses.archive")}</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        dangerous
        confirmLabel={t("tcourses.archive")}
        description={
          archiveTarget
            ? `Archive "${archiveTarget.title}"? It leaves the catalog and can no longer be enrolled in. You can restore it later.`
            : ""
        }
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => void executeArchive()}
        open={archiveTarget !== null}
        pending={isArchiving}
        title={t("tcourses.archive")}
      />
    </div>
  );
}
