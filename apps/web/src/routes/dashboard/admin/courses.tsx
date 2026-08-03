import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Layers3,
  CheckCircle2,
  XCircle,
  MessageSquareText,
  GraduationCap,
  Search,
  Plus,
  Eye,
  Archive,
  ArchiveRestore
} from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseSummary } from "@/lib/api/courses";
import {
  approveCourse,
  listCourses,
  rejectCourse,
  restoreCourse,
  withdrawCourse
} from "@/lib/api/courses";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/courses")({
  component: AdminCoursesPage,
  errorComponent: RouteErrorView
} as never);

type StatusFilter = "ALL" | CourseSummary["status"];

const STATUS_OPTIONS: readonly StatusFilter[] = [
  "ALL",
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  "ARCHIVED"
];

function AdminCoursesPage(): JSX.Element {
  const t = useT();

  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedbackByCourseId, setFeedbackByCourseId] = useState<Record<string, string>>({});

  const filters = { limit: 12, page, search, status: status === "ALL" ? undefined : status };
  const { data, isPending: isLoading } = useQuery({
    queryFn: async () => listCourses(filters),
    queryKey: queryKeys.admin.courses(filters)
  });

  const courses: readonly CourseSummary[] = data?.data ?? [];
  const totalPages = data?.pagination.pages ?? 1;

  const loadCourses = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.courses(filters) });
  };

  const withBusy = async (courseId: string, action: () => Promise<void>): Promise<void> => {
    setBusyId(courseId);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = (courseId: string): void => {
    void withBusy(courseId, async () => {
      await approveCourse(courseId);
      toast.success(t("admin.approve.approved"));
      await loadCourses();
    });
  };

  const handleReject = (course: CourseSummary): void => {
    const feedback = feedbackByCourseId[course.id]?.trim() ?? "";

    if (feedback.length < 8) {
      toast.error(t("admin.approve.needFeedback"));
      return;
    }

    void withBusy(course.id, async () => {
      await rejectCourse(course.id, { feedback });
      toast.success(t("admin.approve.sentBack"));
      await loadCourses();
    });
  };

  const handleArchive = (course: CourseSummary): void => {
    if (
      !window.confirm(
        `Withdraw "${course.title}" from the catalog? Enrolled students keep access. Restorable.`
      )
    ) {
      return;
    }

    void withBusy(course.id, async () => {
      await withdrawCourse(course.id);
      toast.success("Course withdrawn");
      await loadCourses();
    });
  };

  const handleRestore = (course: CourseSummary): void => {
    void withBusy(course.id, async () => {
      await restoreCourse(course.id);
      toast.success("Course restored as a draft");
      await loadCourses();
    });
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
                <Skeleton className="h-6 w-24 rounded-full bg-chip-active" />
                <Skeleton className="h-8 w-3/4 bg-chip-active" />
                <Skeleton className="aspect-video w-full bg-chip-active" />
                <Skeleton className="h-10 w-full bg-chip-active" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-hairline bg-card p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center border border-hairline bg-panel-warm">
                <GraduationCap className="size-5" />
              </div>
              <h1 className="text-xl font-medium text-ink">Course management</h1>
            </div>
            <p className="max-w-2xl text-sm font-light leading-relaxed text-muted">
              Create, edit and curate every course. Approve or send back pending proposals, withdraw
              (archive) published ones, and restore withdrawn drafts.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/dashboard/courses/new">
              <Plus className="mr-1.5 size-4" /> Create course
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-faint" />
            <Input
              className="pl-10"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title..."
              value={search}
            />
          </div>
          <Select
            className="min-w-40"
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(1);
            }}
            value={status}
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value === "ALL" ? "All statuses" : value.charAt(0) + value.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="border border-hairline bg-card/40 py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center border border-hairline bg-panel-warm">
            <Layers3 className="size-8 text-muted-faint" />
          </div>
          <p className="text-lg font-medium text-ink">No courses found</p>
          <p className="mx-auto max-w-xs text-sm font-light text-muted">
            No courses match this status and search. Clear a filter or create a new course.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {courses.map((course) => {
            const isPending = course.status === "PENDING";
            const isArchived = course.status === "ARCHIVED";
            const isBusy = busyId === course.id;

            return (
              <div key={course.id} className="flex flex-col border border-hairline bg-card p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CourseStatusBadge status={course.status} />
                    <span className="text-xs text-muted-faint">
                      {course.status === "PUBLISHED" && course.publishedAt
                        ? `Published ${new Date(course.publishedAt).toLocaleDateString()}`
                        : course.status === "PENDING" && course.submittedAt
                          ? `Submitted ${new Date(course.submittedAt).toLocaleDateString()}`
                          : `Updated ${new Date(course.updatedAt).toLocaleDateString()}`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-lg font-medium text-ink">{course.title}</h2>
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
                        <p className="text-xs font-semibold text-white">
                          Creator: {course.creator.name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center border border-hairline bg-panel-warm text-xs italic text-muted-faint">
                      {t("admin.approve.noCover")}
                    </div>
                  )}

                  <p className="line-clamp-2 border-l-2 border-hairline pl-3 text-sm font-light italic text-muted">
                    &ldquo;{course.description}&rdquo;
                  </p>

                  {isPending && (
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
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/dashboard/courses/$id/edit" params={{ id: course.id }}>
                        <Eye className="mr-1.5 size-4" /> View / Edit
                      </Link>
                    </Button>

                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleApprove(course.id)}
                        >
                          <CheckCircle2 className="mr-1.5 size-4" />{t("admin.approve.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => handleReject(course)}
                        >
                          <XCircle className="mr-1.5 size-4 text-error" />{t("admin.approve.reject")}
                        </Button>
                      </>
                    )}

                    {isArchived ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => handleRestore(course)}
                      >
                        <ArchiveRestore className="mr-1.5 size-4" /> Restore
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => handleArchive(course)}
                        className="text-error"
                      >
                        <Archive className="mr-1.5 size-4" />
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="border border-hairline/20 bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/40">
          Page <span className="text-ink font-mono text-xs">{page} / {totalPages}</span>
        </p>
        <div className="flex gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t("common.back")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("common.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}