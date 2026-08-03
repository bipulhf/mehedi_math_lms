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
  ArchiveRestore,
  X
} from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const [rejectTarget, setRejectTarget] = useState<CourseSummary | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

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
    setRejectFeedback("");
    setRejectTarget(course);
  };

  const closeRejectModal = (): void => {
    setRejectTarget(null);
    setRejectFeedback("");
  };

  const submitReject = async (): Promise<void> => {
    const feedback = rejectFeedback.trim();

    if (feedback.length < 8) {
      toast.error(t("admin.approve.needFeedback"));
      return;
    }

    if (!rejectTarget) {
      return;
    }

    setIsRejecting(true);
    try {
      await rejectCourse(rejectTarget.id, { feedback });
      toast.success(t("admin.approve.sentBack"));
      closeRejectModal();
      await loadCourses();
    } finally {
      setIsRejecting(false);
    }
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
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-hairline/10 bg-panel-warm/30">
                <Skeleton className="h-14 w-24 shrink-0 bg-chip-active" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 bg-chip-active" />
                  <Skeleton className="h-3 w-1/3 bg-chip-active" />
                </div>
                <Skeleton className="h-8 w-20 bg-chip-active" />
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
        <div className="border border-hairline bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-panel-warm/10 border-b border-hairline/20">
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("courses.title")}</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">Creator</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">Status</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">Price</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">Date</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30 text-right">{t("admin.users.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/10">
                {courses.map((course) => {
                  const isPending = course.status === "PENDING";
                  const isArchived = course.status === "ARCHIVED";
                  const isBusy = busyId === course.id;

                  return (
                    <tr key={course.id} className="group hover:bg-ink/[0.03] transition-colors">
                      {/* Course: thumbnail + title + meta */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="size-24 shrink-0 overflow-hidden border border-hairline bg-panel-warm">
                            {course.coverImageUrl ? (
                              <ResponsiveImage
                                alt={course.title}
                                className="h-full w-full object-cover"
                                sizes="96px"
                                src={course.coverImageUrl}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-faint">
                                <GraduationCap className="size-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              className="line-clamp-1 font-body text-base font-medium text-ink tracking-tight hover:text-accent transition-colors"
                              to="/dashboard/courses/$id/edit"
                              params={{ id: course.id }}
                            >
                              {course.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge tone="quiet">
                                <Layers3 className="mr-1 size-3 opacity-50" />
                                {course.category.name}
                              </Badge>
                              {course.isExamOnly && (
                                <Badge tone="quiet">
                                  <GraduationCap className="mr-1 size-3 opacity-50" />
                                  Exam only
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-muted">{course.creator.name}</span>
                      </td>

                      <td className="px-6 py-4">
                        <CourseStatusBadge status={course.status} />
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-ink">
                          ৳{Number(course.price).toLocaleString()}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold uppercase tracking-tighter text-ink/40">
                          {course.status === "PUBLISHED" && course.publishedAt
                            ? `Published ${new Date(course.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                            : course.status === "PENDING" && course.submittedAt
                              ? `Submitted ${new Date(course.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                              : `Updated ${new Date(course.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild size="sm" variant="ghost" title="Edit course">
                              <Link to="/dashboard/courses/$id/edit" params={{ id: course.id }}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>

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
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

      {/* Reject / send-back modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
          <div
            className="relative w-full max-w-lg border border-hairline bg-card p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-modal-title"
          >
            <div className="mb-6 flex items-start justify-between border-b border-hairline pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquareText className="size-5 text-error" />
                  <h2 className="text-xl font-medium text-ink" id="reject-modal-title">
                    {t("admin.approve.reject")}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-faint">
                  Why was &ldquo;{rejectTarget.title}&rdquo; sent back?
                </p>
              </div>
              <button
                className="p-1 text-muted hover:text-ink transition-colors"
                onClick={closeRejectModal}
                type="button"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void submitReject();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="reject-feedback">{t("admin.approve.feedback")}</Label>
                <Textarea
                  autoFocus
                  className="text-sm"
                  id="reject-feedback"
                  maxLength={2000}
                  onChange={(event) => setRejectFeedback(event.target.value)}
                  placeholder={t("admin.approve.feedbackPlaceholder")}
                  required
                  rows={4}
                  value={rejectFeedback}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-faint">
                    {rejectFeedback.length} / 2000
                  </span>
                  {rejectFeedback.trim().length > 0 && rejectFeedback.trim().length < 8 && (
                    <span className="text-xs text-error">{t("admin.approve.needFeedback")}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-hairline">
                <Button className="flex-1" disabled={isRejecting} size="lg" type="submit">
                  <XCircle className="mr-1.5 size-4" />
                  {isRejecting ? "Sending back…" : t("admin.approve.reject")}
                </Button>
                <Button onClick={closeRejectModal} size="lg" type="button" variant="outline">
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}