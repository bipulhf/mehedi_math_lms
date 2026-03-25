import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import type { JSX } from "react";

import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryNode } from "@/lib/api/categories";
import type { CourseSummary } from "@/lib/api/courses";
import { findCategoryBySlug } from "@/lib/category-tree";
import { breadcrumbJsonLd, catalogItemListFromCourses, seo } from "@/lib/seo";
import { SsrNotFoundError, ssrApiGet, ssrApiGetCourses } from "@/lib/ssr-api";
import { siteConfig } from "@/lib/site";

export const Route = createFileRoute("/categories/$slug")({
  loader: async ({ params }) => {
    let tree: readonly CategoryNode[];

    try {
      tree = await ssrApiGet<CategoryNode[]>("/categories");
    } catch (error) {
      if (error instanceof SsrNotFoundError) {
        throw notFound();
      }

      throw error;
    }

    const category = findCategoryBySlug(tree, params.slug);

    if (!category) {
      throw notFound();
    }

    const { data: courses } = await ssrApiGetCourses({
      categoryId: category.id,
      limit: 48,
      page: 1,
      status: "PUBLISHED"
    });

    return { category, courses };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return seo({
        description: siteConfig.description,
        path: `/categories/${params.slug}`,
        title: "Category"
      });
    }

    const { category, courses } = loaderData;

    return seo({
      description:
        category.description?.trim() ??
        `Browse published courses tagged under ${category.name} at Mehedi's Math Academy.`,
      jsonLd: [
        catalogItemListFromCourses(courses),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Categories", path: "/categories" },
          { name: category.name, path: `/categories/${category.slug}` }
        ])
      ],
      path: `/categories/${category.slug}`,
      title: category.name
    });
  },
  component: CategoryCoursesPage,
  errorComponent: RouteErrorView
});

function CategoryCourseCard({ course }: { course: CourseSummary }): JSX.Element {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video overflow-hidden bg-surface-container-low">
        {course.coverImageUrl ? (
          <img
            alt={course.title}
            className="h-full w-full object-cover"
            height={675}
            loading="lazy"
            src={course.coverImageUrl}
            width={1200}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(96,99,238,0.18),transparent_55%),linear-gradient(135deg,rgba(27,27,31,0.04),rgba(96,99,238,0.1))]" />
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <CardTitle className="text-lg">{course.title}</CardTitle>
        <CardDescription className="line-clamp-2">{course.description}</CardDescription>
        <Link className="text-sm font-semibold text-secondary-container" to="/courses/$slug" params={{ slug: course.slug }}>
          View course
        </Link>
      </CardContent>
    </Card>
  );
}

function CategoryCoursesPage(): JSX.Element {
  const { category, courses } = Route.useLoaderData();

  return (
    <PublicLayout
      eyebrow="Category spotlight"
      title={category.name}
      subtitle={
        category.description ??
        "Every course listed here shares this academic lane. Open a card to see pricing, teachers, and enrollment details."
      }
    >
      <div className="space-y-6">
        {category.children.length > 0 ? (
          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle>Subcategories</CardTitle>
                <CardDescription>Move one layer deeper inside this academic branch.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {category.children.map((child: CategoryNode) => (
                  <Link
                    key={child.id}
                    className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface"
                    to="/categories/$slug"
                    params={{ slug: child.slug }}
                  >
                    {child.name}
                  </Link>
                ))}
              </CardContent>
            </Card>
          </FadeIn>
        ) : null}

        {courses.length === 0 ? (
          <p className="text-sm text-on-surface/68">No published courses in this category yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course: CourseSummary, index: number) => (
              <FadeIn key={course.id} delayClassName={index > 0 ? "delay-75" : undefined}>
                <CategoryCourseCard course={course} />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
