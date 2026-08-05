import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Archive, ExternalLink, Plus, Send } from "lucide-react";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseSummary } from "@/lib/api/courses";
import { listCourses, submitCourse, withdrawCourse } from "@/lib/api/courses";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/courses/")({
  head: () =>
    seo({
      description: "Every course you teach, with its status and stats.",
      path: "/dashboard/courses",
      title: "My Courses"
    }),
  component: DashboardCoursesPage,
  errorComponent: RouteErrorView
} as never);

function CourseListSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full max-w-64" />
      <div className="border border-hairline bg-card">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton className="m-4 h-10" key={index} />
        ))}
      </div>
    </div>
  );
}

function DashboardCoursesPage(): JSX.Element {
  const t = useT();
  const format = useFormat();

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

  const [archiveTarget, setArchiveTarget] = useState<CourseSummary | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const loadCourses = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
  };

  const handleSubmit = async (courseId: string): Promise<void> => {
    await submitCourse(courseId);
    toast.success(t("tcourses.submitted"));
    await loadCourses();
  };

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

  const columns = useMemo<readonly DataTableColumn<CourseSummary>[]>(
    () => [
      {
        cell: (course) => (
          <div className="min-w-0 space-y-1">
            <Link
              className="block truncate text-base font-medium text-ink transition-colors hover:text-accent"
              params={{ id: course.id }}
              to="/dashboard/courses/$id/edit"
            >
              {course.title}
            </Link>
            <p className="text-sm text-muted-light">{course.category.name}</p>
          </div>
        ),
        header: t("mine.colCourse"),
        key: "course"
      },
      {
        cell: (course) => <CourseStatusBadge status={course.status} />,
        header: t("tcourses.statusFilter"),
        key: "status"
      },
      {
        cell: (course) => format.number(course.stats.lectureCount),
        header: t("common.lessons"),
        key: "lessons"
      },
      {
        cell: (course) => format.currency(course.price),
        header: t("editor.price"),
        key: "price"
      },
      {
        align: "end",
        cell: (course) => (
          <div className="flex flex-wrap justify-end gap-2">
            {course.status === "PUBLISHED" ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  params={{ slug: course.slug }}
                  rel="noopener noreferrer"
                  target="_blank"
                  to="/courses/$slug"
                >
                  <ExternalLink className="size-4" />
                  {t("cat.viewCourse")}
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link params={{ id: course.id }} to="/dashboard/courses/$id/notices">
                {t("manage.notices")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link params={{ id: course.id }} to="/dashboard/courses/$id/discussions">
                {t("manage.discussions")}
              </Link>
            </Button>
            {course.status !== "PENDING" &&
            course.status !== "PUBLISHED" &&
            course.status !== "ARCHIVED" ? (
              <Button onClick={() => void handleSubmit(course.id)} size="sm" type="button">
                <Send className="size-4" />
                {t("tcourses.submit")}
              </Button>
            ) : null}
            {course.status !== "ARCHIVED" ? (
              <Button
                className="text-error"
                onClick={() => setArchiveTarget(course)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Archive className="size-4" />
                {t("tcourses.archive")}
              </Button>
            ) : null}
          </div>
        ),
        header: t("mine.colActions"),
        key: "actions"
      }
    ],
    [format, t]
  );

  if (isLoading) {
    return <CourseListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium text-ink">{t("tcourses.title")}</h1>
          <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-muted">
            {t("courses.resultCount", {
              shown: format.number(courses.length),
              total: format.number(data?.pagination.total ?? courses.length)
            })}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="status-filter">{t("tcourses.statusFilter")}</Label>
            <Select
              id="status-filter"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="">{t("tcourses.allStates")}</option>
              <option value="DRAFT">{t("tcourses.drafts")}</option>
              <option value="PENDING">{t("tcourses.underReview")}</option>
              <option value="PUBLISHED">{t("tcourses.live")}</option>
              <option value="ARCHIVED">{t("tcourses.archived")}</option>
            </Select>
          </div>
          <Button asChild className="shrink-0" size="lg">
            <Link to="/dashboard/courses/new">
              <Plus className="size-4" />
              {t("tcourses.add")}
            </Link>
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        emptyState={
          <EmptyState
            action={
              <Button asChild>
                <Link to="/dashboard/courses/new">{t("tcourses.add")}</Link>
              </Button>
            }
            message={t("tcourses.empty")}
          />
        }
        rowKey={(course) => course.id}
        rows={courses}
      />

      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        confirmLabel={t("tcourses.archive")}
        dangerous
        description={
          archiveTarget ? t("tcourses.archiveConfirm", { title: archiveTarget.title }) : ""
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
