import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Layers3, ListOrdered, RotateCcw, Save, Search, X } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listCourses } from "@/lib/api/courses";
import type { FeaturedCourse } from "@/lib/api/landing";
import { getFeaturedCourses, updateFeaturedCourses } from "@/lib/api/landing";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

const MAX_FEATURED = 6;

export const Route = createFileRoute("/dashboard/admin/featured-courses")({
  head: () =>
    seo({
      description: "Choose which published courses appear in the homepage carousel and their order.",
      path: "/dashboard/admin/featured-courses",
      title: "Featured Courses"
    }),
  component: FeaturedCoursesPage,
  errorComponent: RouteErrorView
} as never);

function FeaturedCoursesPage(): JSX.Element {
  const t = useT();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<readonly FeaturedCourse[]>([]);
  const [isSeeded, setIsSeeded] = useState(false);
  const [search, setSearch] = useState("");
  const [pickerValue, setPickerValue] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { data: featured, isPending: isLoading } = useQuery({
    queryFn: async () => getFeaturedCourses(),
    queryKey: queryKeys.admin.featured()
  });

  const { data: catalogData, isPending: isCatalogPending } = useQuery({
    queryFn: async () => listCourses({ limit: 100, page: 1, search, status: "PUBLISHED" }),
    queryKey: queryKeys.courses.list({ featuredPicker: true, search })
  });

  const catalog = useMemo(
    () => (catalogData?.data ?? []).filter((course) => !draft.some((f) => f.id === course.id)),
    [catalogData, draft]
  );

  // Seed the working list from the server once. Later refetches must not clobber
  // the user's unsaved edits.
  useEffect(() => {
    if (isSeeded || !featured) {
      return;
    }

    setDraft(featured);
    setIsSeeded(true);
  }, [featured, isSeeded]);

  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction;

    if (target < 0 || target >= draft.length) {
      return;
    }

    const next = [...draft];
    const current = next[index]!;

    next[index] = next[target]!;
    next[target] = current;
    setDraft(next);
  };

  const remove = (index: number): void => {
    setDraft(draft.filter((_, i) => i !== index));
  };

  const add = (courseId: string): void => {
    if (draft.length >= MAX_FEATURED) {
      return;
    }

    const course = catalog.find((entry) => entry.id === courseId);

    if (!course) {
      return;
    }

    setDraft([...draft, { id: course.id, slug: course.slug, title: course.title }]);
    setPickerValue("");
    setSearch("");
  };

  const save = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await updateFeaturedCourses(draft.map((entry) => entry.id));
      toast.success(t("admin.featured.saved"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.featured() });
    } finally {
      setIsSaving(false);
    }
  };

  const reset = async (): Promise<void> => {
    setIsResetting(true);
    try {
      await updateFeaturedCourses([]);
      setConfirmReset(false);
      setDraft([]);
      toast.success(t("admin.featured.resetDone"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.featured() });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border border-hairline bg-card p-6">
          <Skeleton className="mb-3 h-7 w-52 bg-chip-active" />
          <Skeleton className="h-4 w-full max-w-lg bg-chip-active" />
        </div>
        <div className="border border-hairline bg-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="flex items-center gap-4 border-b border-hairline/10 p-4" key={i}>
              <Skeleton className="h-6 w-6 bg-chip-active" />
              <Skeleton className="h-4 flex-1 bg-chip-active" />
              <Skeleton className="h-8 w-24 bg-chip-active" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-hairline bg-card p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center border border-hairline bg-panel-warm">
            <ListOrdered className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-ink">{t("admin.featured.title")}</h1>
            <p className="mt-1 max-w-2xl text-sm font-light leading-relaxed text-muted">
              {t("admin.featured.lead")}
            </p>
          </div>
        </div>

        {/* Add-course picker */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-faint" />
            <Input
              className="pl-10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("admin.featured.searchPlaceholder")}
              value={search}
            />
          </div>
          <div className="sm:w-96">
            <Select
              disabled={draft.length >= MAX_FEATURED || isCatalogPending}
              onChange={(event) => add(event.target.value)}
              value={pickerValue}
            >
              <option disabled value="">
                {draft.length >= MAX_FEATURED
                  ? t("admin.featured.atCapacity")
                  : t("admin.featured.pickPlaceholder")}
              </option>
              {catalog.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Ordered list */}
      <div className="border border-hairline bg-card">
        {draft.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center border border-hairline bg-panel-warm">
              <Layers3 className="size-8 text-muted-faint" />
            </div>
            <p className="text-lg font-medium text-ink">{t("admin.featured.emptyTitle")}</p>
            <p className="mx-auto max-w-xs text-sm font-light text-muted">
              {t("admin.featured.emptyLead")}
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-hairline/10">
            {draft.map((entry, index) => (
              <li className="flex items-center gap-4 p-4" key={entry.id}>
                <span className="flex size-8 shrink-0 items-center justify-center border border-hairline bg-panel-warm font-mono text-sm text-ink">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-body text-base text-ink">
                  {entry.title}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    aria-label={t("admin.featured.moveUp")}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    size="sm"
                    variant="ghost"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    aria-label={t("admin.featured.moveDown")}
                    disabled={index === draft.length - 1}
                    onClick={() => move(index, 1)}
                    size="sm"
                    variant="ghost"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    aria-label={t("admin.featured.remove")}
                    className="text-error"
                    onClick={() => remove(index)}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border border-hairline bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <Button
          disabled={isResetting || isSaving || draft.length === 0}
          onClick={() => setConfirmReset(true)}
          size="sm"
          variant="outline"
        >
          <RotateCcw className="mr-1.5 size-4" />
          {t("admin.featured.reset")}
        </Button>
        <Button disabled={isSaving || isResetting} onClick={() => void save()} size="sm">
          <Save className="mr-1.5 size-4" />
          {isSaving ? t("admin.featured.saving") : t("admin.featured.save")}
        </Button>
      </div>

      <ConfirmDialog
        cancelLabel={t("action.cancel")}
        confirmLabel={t("admin.featured.reset")}
        dangerous
        description={t("admin.featured.resetDesc")}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => void reset()}
        open={confirmReset}
        pending={isResetting}
        title={t("admin.featured.resetTitle")}
      />
    </div>
  );
}
