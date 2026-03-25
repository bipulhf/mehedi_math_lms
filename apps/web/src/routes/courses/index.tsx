import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { CourseCard, CourseGridSkeleton } from "@/components/courses/course-card";
import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import type { CourseSummary } from "@/lib/api/courses";
import { listCourses } from "@/lib/api/courses";
import { breadcrumbJsonLd, catalogItemListFromCourses, seo } from "@/lib/seo";
import { ssrApiGetCourses } from "@/lib/ssr-api";

export const Route = createFileRoute("/courses/")({
  head: ({ loaderData }) => {
    const courses = loaderData?.coursesForLd ?? [];

    return seo({
      description:
        "Explore every published mathematics program at Mehedi's Math Academy: pricing, teachers, and enrollment in one editorial catalog.",
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
    const { data } = await ssrApiGetCourses({ limit: 24, page: 1, status: "PUBLISHED" });

    return { coursesForLd: data };
  },
  component: CoursesCatalogPage,
  errorComponent: RouteErrorView
});

function flattenCategories(categories: readonly CategoryNode[]): readonly CategoryNode[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function CoursesCatalogPage(): JSX.Element {
  const [categories, setCategories] = useState<readonly CategoryNode[]>([]);
  const [courses, setCourses] = useState<readonly CourseSummary[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const categoryData = await listCategories();
      setCategories(categoryData);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const response = await listCourses({
          categoryId: categoryId || undefined,
          limit: 12,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          page: 1,
          search: search || undefined
        });
        setCourses(response.data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [categoryId, maxPrice, search]);

  const flatCategories = flattenCategories(categories);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10">
      <FadeIn>
        <Card>
          <CardHeader>
            <CardTitle>Course catalog</CardTitle>
            <CardDescription>
              Browse published math programs, compare pricing, and move from broad category discovery into a detailed course view.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="course-search">Search</Label>
              <Input
                id="course-search"
                placeholder="Search by course title"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-category-filter">Category</Label>
              <Select
                id="course-category-filter"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">All categories</option>
                {flatCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-price-filter">Max price</Label>
              <Input
                id="course-price-filter"
                min={0}
                placeholder="Any"
                type="number"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {isLoading ? <CourseGridSkeleton /> : null}

      {!isLoading && courses.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm leading-6 text-on-surface/70">
            No published courses match the current filters.
          </CardContent>
        </Card>
      ) : null}

      {!isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
