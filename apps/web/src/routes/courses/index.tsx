import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InfiniteData, QueryKey } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { z } from "zod";

import { CourseCard, CourseGridSkeleton, CourseListCard } from "@/components/courses/course-card";
import { CourseFilterRail } from "@/components/courses/course-filter-rail";
import { PublicLayout } from "@/components/layout/public-layout";
import { RouteErrorView } from "@/components/common/route-error";
import type { PaginatedEnvelope } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { FilterPill } from "@/components/ui/pill";
import { RingedWord } from "@/components/ui/doodles";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import type { CourseSummary } from "@/lib/api/courses";
import { listCourses } from "@/lib/api/courses";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { breadcrumbJsonLd, catalogItemListFromCourses, seo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { ssrApiGetCourses } from "@/lib/ssr-api";

const PAGE_SIZE = 24;

const searchSchema = z.object({
  /** ফ্রি ক্লাস in the header nav lands here. */
  free: z.coerce.boolean().optional()
});

export type CourseSortOrder = "newest" | "priceLow" | "priceHigh";

export const Route = createFileRoute("/courses/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: ({ loaderData }) => {
    const courses = loaderData?.coursesForLd ?? [];

    return seo({
      description:
        "Explore every published course on Genex: level, subject, teacher and price in one catalogue.",
      jsonLd: [
        catalogItemListFromCourses(courses),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Courses", path: "/courses" }
        ])
      ],
      path: "/courses",
      title: "Course catalog"
    });
  },
  loader: async () => {
    const { data } = await ssrApiGetCourses({ limit: PAGE_SIZE, page: 1, status: "PUBLISHED" });

    return { coursesForLd: data };
  },
  component: CoursesCatalogPage,
  errorComponent: RouteErrorView,
  // The catalogue's own two-column container, not a bare grid: the filter rail
  // appearing only after the loader resolved shifted every card left by 296px.
  pendingComponent: () => (
    <PublicLayout>
      <div className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[296px_1fr] lg:gap-12 lg:px-14">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-40 w-full" key={index} />
          ))}
        </div>
        <div className="min-w-0 space-y-6">
          <Skeleton className="h-6 w-1/3" />
          <CourseGridSkeleton />
        </div>
      </div>
    </PublicLayout>
  )
});

function sortCourses(
  courses: readonly CourseSummary[],
  order: CourseSortOrder
): readonly CourseSummary[] {
  if (order === "newest") {
    return courses;
  }

  const direction = order === "priceLow" ? 1 : -1;

  return [...courses].sort((a, b) => (Number(a.price) - Number(b.price)) * direction);
}

function CoursesCatalogPage(): JSX.Element {
  const searchParams = Route.useSearch();
  const t = useT();
  const format = useFormat();

  const [levelId, setLevelId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<CourseSortOrder>("newest");
  const [isFreeOnly, setIsFreeOnly] = useState(searchParams.free === true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const { data: categories = [] } = useQuery<readonly CategoryNode[]>({
    queryFn: async () => listCategories(),
    queryKey: queryKeys.categories.list()
  });

  // The subject narrows the level, so whichever is more specific decides the
  // query. Sending both would need an `in` filter the endpoint does not have.
  const categoryId = subjectId ?? levelId ?? undefined;
  const filters = {
    categoryId: categoryId ?? "all",
    free: isFreeOnly,
    search
  };

  const {
    data: coursePages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending
  } = useInfiniteQuery<
    PaginatedEnvelope<CourseSummary>,
    Error,
    InfiniteData<PaginatedEnvelope<CourseSummary>, number>,
    QueryKey,
    number
  >({
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages
        ? lastPage.pagination.page + 1
        : undefined,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      listCourses({
        ...(categoryId === undefined ? {} : { categoryId }),
        ...(isFreeOnly ? { hasFreeLesson: true } : {}),
        limit: PAGE_SIZE,
        page: pageParam,
        ...(search.length === 0 ? {} : { search })
      }),
    queryKey: queryKeys.courses.list(filters)
  });

  const courses = useMemo(
    () => sortCourses(coursePages?.pages.flatMap((page) => page.data) ?? [], sortOrder),
    [coursePages?.pages, sortOrder]
  );
  const totalCourses = coursePages?.pages[0]?.pagination.total ?? courses.length;

  const resetFilters = (): void => {
    setLevelId(null);
    setSubjectId(null);
    setSearch("");
    setIsFreeOnly(false);
  };

  const activeLevel = categories.find((category) => category.id === levelId);
  const activeSubject = categories.find((category) => category.id === subjectId);
  const hasActiveFilters =
    levelId !== null || subjectId !== null || search.length > 0 || isFreeOnly;
  const filterCount =
    [levelId, subjectId].filter((id) => id !== null).length +
    (search.length > 0 ? 1 : 0) +
    (isFreeOnly ? 1 : 0);

  const sortOptions: readonly { label: string; value: CourseSortOrder }[] = [
    { label: t("courses.sort.newest"), value: "newest" },
    { label: t("courses.sort.priceLow"), value: "priceLow" },
    { label: t("courses.sort.priceHigh"), value: "priceHigh" }
  ];

  const viewOptions: readonly { label: string; value: "grid" | "list" }[] = [
    { label: t("courses.view.grid"), value: "grid" },
    { label: t("courses.view.list"), value: "list" }
  ];

  const filterRail = (
    <CourseFilterRail
      categories={categories}
      isFreeOnly={isFreeOnly}
      levelId={levelId}
      onLevelChange={(next) => {
        setLevelId(next);
        setSubjectId(null);
      }}
      onReset={resetFilters}
      onSearchChange={setSearch}
      onSubjectChange={setSubjectId}
      onToggleFreeOnly={() => setIsFreeOnly((current) => !current)}
      search={search}
      subjectId={subjectId}
    />
  );

  return (
    <PublicLayout
      eyebrow={t("nav.courses")}
      subtitle={t("courses.lead")}
      title={<RingedWord>{t("courses.title")}</RingedWord>}
    >
      <div className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[296px_1fr] lg:gap-12 lg:px-14 animate-fade-in">
        <div className="hidden lg:block">{filterRail}</div>

        <div className="min-w-0 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base text-muted">
              {t("courses.resultCount", {
                shown: format.number(courses.length),
                total: format.number(totalCourses)
              })}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="lg:hidden"
                onClick={() => setIsFilterModalOpen(true)}
                size="sm"
                variant="outline"
              >
                {t("courses.filters")}
                {filterCount > 0 ? (
                  <span className="grid size-5 place-items-center rounded-full bg-chip-active text-xs text-ink">
                    {format.number(filterCount)}
                  </span>
                ) : null}
              </Button>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <FilterPill
                    isSelected={sortOrder === option.value}
                    key={option.value}
                    onClick={() => setSortOrder(option.value)}
                  >
                    {option.label}
                  </FilterPill>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-sm border border-hairline p-1">
                {viewOptions.map((option) => (
                  <button
                    aria-pressed={viewMode === option.value}
                    className={cn(
                      "rounded-sm px-2.5 py-1.5 text-sm transition-colors",
                      viewMode === option.value
                        ? "bg-chip-active text-ink"
                        : "text-muted hover:text-ink"
                    )}
                    key={option.value}
                    onClick={() => setViewMode(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-mono text-xs uppercase text-muted-faint">
                {t("courses.activeFilters")}
              </span>
              {activeLevel ? (
                <button
                  className="flex items-center gap-2 border border-hairline bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-line-strong"
                  onClick={() => {
                    setLevelId(null);
                    setSubjectId(null);
                  }}
                  type="button"
                >
                  {activeLevel.name}
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
              {activeSubject ? (
                <button
                  className="flex items-center gap-2 border border-hairline bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-line-strong"
                  onClick={() => setSubjectId(null)}
                  type="button"
                >
                  {activeSubject.name}
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
              {search.length > 0 ? (
                <button
                  className="flex items-center gap-2 border border-hairline bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-line-strong"
                  onClick={() => setSearch("")}
                  type="button"
                >
                  “{search}”<span aria-hidden="true">×</span>
                </button>
              ) : null}
              {isFreeOnly ? (
                <button
                  className="flex items-center gap-2 border border-hairline bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-line-strong"
                  onClick={() => setIsFreeOnly(false)}
                  type="button"
                >
                  {t("courses.freeOnly")}
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
              <button
                className="border-b border-line-strong pb-0.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
                onClick={resetFilters}
                type="button"
              >
                {t("action.clearFilters")}
              </button>
            </div>
          ) : null}

          {isPending ? (
            // The placeholder follows the view toggle: a two-column grid of
            // cards standing in for a list of full-width rows is a reshuffle.
            <CourseGridSkeleton
              cardClassName={viewMode === "grid" ? "h-[22rem] w-full" : "h-32 w-full sm:h-40"}
              className={viewMode === "grid" ? "grid gap-5 sm:grid-cols-2" : "flex flex-col gap-5"}
            />
          ) : courses.length === 0 ? (
            <EmptyState
              action={
                <Button onClick={resetFilters} size="sm" variant="outline">
                  {t("action.clearFilters")}
                </Button>
              }
              message={t("empty.courses")}
            />
          ) : viewMode === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {courses.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {courses.map((course) => (
                <CourseListCard course={course} key={course.id} />
              ))}
            </div>
          )}

          {hasNextPage ? (
            <Button
              className="w-full"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
              size="lg"
              variant="outline"
            >
              {isFetchingNextPage ? t("common.loading") : t("action.loadMore")}
            </Button>
          ) : null}
        </div>
      </div>

      <Modal
        onClose={() => setIsFilterModalOpen(false)}
        open={isFilterModalOpen}
        title={t("courses.filters")}
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">{filterRail}</div>
      </Modal>
    </PublicLayout>
  );
}
