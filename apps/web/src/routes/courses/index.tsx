import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { z } from "zod";

import { CourseCard, CourseGridSkeleton } from "@/components/courses/course-card";
import { CourseFilterRail } from "@/components/courses/course-filter-rail";
import { PublicLayout, PublicSection } from "@/components/layout/public-layout";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPill } from "@/components/ui/pill";
import { RingedWord } from "@/components/ui/doodles";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import type { CourseSummary } from "@/lib/api/courses";
import { listCourses } from "@/lib/api/courses";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { breadcrumbJsonLd, catalogItemListFromCourses, seo } from "@/lib/seo";
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
  pendingComponent: () => (
    <PublicLayout>
      <PublicSection>
        <CourseGridSkeleton />
      </PublicSection>
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
    limit: PAGE_SIZE,
    page: 1,
    search
  };

  const { data: coursePage, isPending } = useQuery({
    queryFn: async () =>
      listCourses({
        ...(categoryId === undefined ? {} : { categoryId }),
        ...(isFreeOnly ? { hasFreeLesson: true } : {}),
        limit: PAGE_SIZE,
        page: 1,
        ...(search.length === 0 ? {} : { search })
      }),
    queryKey: queryKeys.courses.list(filters)
  });

  const courses = useMemo(
    () => sortCourses(coursePage?.data ?? [], sortOrder),
    [coursePage?.data, sortOrder]
  );

  const resetFilters = (): void => {
    setLevelId(null);
    setSubjectId(null);
    setSearch("");
    setIsFreeOnly(false);
  };

  const sortOptions: readonly { label: string; value: CourseSortOrder }[] = [
    { label: t("courses.sort.newest"), value: "newest" },
    { label: t("courses.sort.priceLow"), value: "priceLow" },
    { label: t("courses.sort.priceHigh"), value: "priceHigh" }
  ];

  return (
    <PublicLayout
      eyebrow={t("nav.courses")}
      subtitle={t("courses.lead")}
      title={<RingedWord>{t("courses.title")}</RingedWord>}
    >
      <div className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[296px_1fr] lg:gap-12 lg:px-14 animate-fade-in">
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

        <div className="min-w-0 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base text-muted">
              {t("courses.resultCount", {
                shown: format.number(courses.length),
                total: format.number(coursePage?.pagination.total ?? courses.length)
              })}
            </p>
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
          </div>

          {isPending ? (
            <CourseGridSkeleton />
          ) : courses.length === 0 ? (
            <EmptyState
              action={
                <Button onClick={resetFilters} size="sm" variant="outline">
                  {t("action.clearFilters")}
                </Button>
              }
              message={t("empty.courses")}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {courses.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
