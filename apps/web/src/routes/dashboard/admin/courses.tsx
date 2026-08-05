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
  ExternalLink,
  X
} from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { stripHtml } from "@/lib/html";
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
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/courses")({
  head: () =>
    seo({
      description: "Review, approve, or archive courses submitted by teachers.",
      path: "/dashboard/admin/courses",
      title: "Course Approval"
    }),
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
  const [archiveTarget, setArchiveTarget] = useState<CourseSummary | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

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
    const textLength = stripHtml(feedback).trim().length;

    if (textLength < 8) {
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
    setArchiveTarget(course);
  };

  const executeArchive = async (): Promise<void> => {
    if (!archiveTarget) {
      return;
    }

    setIsArchiving(true);
    try {
      await withdrawCourse(archiveTarget.id);
      toast.success(t("admin.courses.withdrawn"));
      setArchiveTarget(null);
      await loadCourses();
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = (course: CourseSummary): void => {
    void withBusy(course.id, async () => {
      await restoreCourse(course.id);
      toast.success(t("admin.courses.restored"));
      await loadCourses();
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-card p-4 sm:p-6 lg:p-8 border border-hairline relative w-full overflow-hidden">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-full max-w-sm mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-hairline/10 bg-panel-warm/30">
                <Skeleton className="h-14 w-24 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-8 w-20" />
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
              <h1 className="text-xl font-medium text-ink">{t("admin.courses.title")}</h1>
            </div>
            <p className="max-w-2xl text-sm font-light leading-relaxed text-muted">
              {t("admin.courses.lead")}
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/dashboard/courses/new">
              <Plus className="mr-1.5 size-4" /> {t("admin.courses.create")}
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
              placeholder={t("admin.courses.searchPlaceholder")}
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
                {value === "ALL" ? t("admin.courses.allStatuses") : value.charAt(0) + value.slice(1).toLowerCase()}
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
          <p className="text-lg font-medium text-ink">{t("admin.courses.notFoundTitle")}</p>
          <p className="mx-auto max-w-xs text-sm font-light text-muted">
            {t("admin.courses.notFoundLead")}
          </p>
        </div>
      ) : (
        <div className="border border-hairline bg-card overflow-hidden">
          {/* Six columns, one of them a 96px thumbnail and one a row of six
              buttons: below `lg` the same rows are stacked as cards. */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-panel-warm/10 border-b border-hairline/20">
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("courses.title")}</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("admin.courses.creator")}</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("admin.courses.status")}</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("admin.courses.price")}</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("admin.courses.date")}</th>
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
                                  {t("admin.courses.examOnly")}
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
                            <Button asChild size="sm" variant="ghost" title={t("action.edit")}>
                              <Link to="/dashboard/courses/$id/edit" params={{ id: course.id }}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>

                            {course.status === "PUBLISHED" ? (
                              <Button asChild size="sm" variant="ghost" title={t("cat.viewCourse")}>
                                <Link
                                  params={{ slug: course.slug }}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                  to="/courses/$slug"
                                >
                                  <ExternalLink className="size-4" />
                                </Link>
                              </Button>
                            ) : null}

                            <Button asChild size="sm" variant="ghost">
                              <Link params={{ id: course.id }} to="/dashboard/courses/$id/notices">
                                {t("manage.notices")}
                              </Link>
                            </Button>

                            <Button asChild size="sm" variant="ghost">
                              <Link
                                params={{ id: course.id }}
                                to="/dashboard/courses/$id/discussions"
                              >
                                {t("manage.discussions")}
                              </Link>
                            </Button>

                            {isArchived ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => handleRestore(course)}
                              >
                                <ArchiveRestore className="mr-1.5 size-4" /> {t("admin.courses.restore")}
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
                                {t("admin.courses.archive")}
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

          <div className="divide-y divide-hairline lg:hidden">
            {courses.map((course) => (
              <div className="space-y-4 p-4" key={course.id}>
                <div className="flex items-start gap-3">
                  <div className="size-16 shrink-0 overflow-hidden border border-hairline bg-panel-warm">
                    {course.coverImageUrl ? (
                      <ResponsiveImage
                        alt={course.title}
                        className="h-full w-full object-cover"
                        sizes="64px"
                        src={course.coverImageUrl}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-faint">
                        <GraduationCap className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      className="line-clamp-2 text-base font-medium tracking-tight text-ink"
                      params={{ id: course.id }}
                      to="/dashboard/courses/$id/edit"
                    >
                      {course.title}
                    </Link>
                    <p className="mt-1 truncate text-sm text-muted">{course.creator.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <CourseStatusBadge status={course.status} />
                      <Badge tone="quiet">{course.category.name}</Badge>
                      <span className="font-mono text-sm text-ink">
                        ৳{Number(course.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* The same actions the row carries, wrapped rather than laid
                    out in one line that would run off the screen. */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link params={{ id: course.id }} to="/dashboard/courses/$id/edit">
                      {t("action.edit")}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link params={{ id: course.id }} to="/dashboard/courses/$id/notices">
                      {t("manage.notices")}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link params={{ id: course.id }} to="/dashboard/courses/$id/discussions">
                      {t("manage.discussions")}
                    </Link>
                  </Button>
                  {course.status === "ARCHIVED" ? (
                    <Button
                      disabled={busyId === course.id}
                      onClick={() => handleRestore(course)}
                      size="sm"
                      variant="outline"
                    >
                      {t("admin.courses.restore")}
                    </Button>
                  ) : (
                    <Button
                      className="text-error"
                      disabled={busyId === course.id}
                      onClick={() => handleArchive(course)}
                      size="sm"
                      variant="ghost"
                    >
                      {t("admin.courses.archive")}
                    </Button>
                  )}
                  {course.status === "PENDING" ? (
                    <>
                      <Button
                        disabled={busyId === course.id}
                        onClick={() => handleApprove(course.id)}
                        size="sm"
                      >
                        {t("admin.approve.approve")}
                      </Button>
                      <Button
                        disabled={busyId === course.id}
                        onClick={() => handleReject(course)}
                        size="sm"
                        variant="outline"
                      >
                        {t("admin.approve.reject")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
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
            className="relative w-full max-w-lg border border-hairline bg-card p-4 sm:p-6 lg:p-8"
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
                <RichTextEditor
                  className="text-sm"
                  id="reject-feedback"
                  onChange={(value) => setRejectFeedback(value)}
                  placeholder={t("admin.approve.feedbackPlaceholder")}
                  value={rejectFeedback}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-faint">
                    {stripHtml(rejectFeedback).trim().length} / 2000
                  </span>
                  {stripHtml(rejectFeedback).trim().length > 0 &&
                    stripHtml(rejectFeedback).trim().length < 8 && (
                      <span className="text-xs text-error">{t("admin.approve.needFeedback")}</span>
                    )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-hairline">
                <Button className="flex-1" disabled={isRejecting} size="lg" type="submit">
                  <XCircle className="mr-1.5 size-4" />
                  {isRejecting ? t("admin.courses.sendingBack") : t("admin.approve.reject")}
                </Button>
                <Button onClick={closeRejectModal} size="lg" type="button" variant="outline">
                  {t("action.cancel")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Archive (soft-delete) confirmation */}
      <ConfirmDialog
        cancelLabel={t("action.cancel")}
        dangerous
        confirmLabel={t("admin.courses.archive")}
        description={
          archiveTarget
            ? `${t("admin.courses.archiveDesc")}`
            : ""
        }
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => void executeArchive()}
        open={archiveTarget !== null}
        pending={isArchiving}
        title={t("admin.courses.archiveTitle")}
      />
    </div>
  );
}
