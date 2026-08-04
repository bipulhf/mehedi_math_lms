import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { CourseGridSkeleton } from "@/components/courses/course-card";
import { PublicLayout, PublicSection } from "@/components/layout/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { CategoryNode } from "@/lib/api/categories";
import type { CourseSummary } from "@/lib/api/courses";
import { findCategoryBySlug } from "@/lib/category-tree";
import { breadcrumbJsonLd, catalogItemListFromCourses, seo } from "@/lib/seo";
import { SsrNotFoundError, ssrApiGet, ssrApiGetCourses } from "@/lib/ssr-api";
import { stripHtml } from "@/lib/html";
import { siteConfig } from "@/lib/site";
import { useT } from "@/lib/i18n/locale-context";

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
        (category.description ? stripHtml(category.description).trim() : undefined) ??
        `Browse published courses tagged under ${category.name} at Genex.`,
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
  errorComponent: RouteErrorView,
  pendingComponent: () => (
    <div className="mx-auto max-w-7xl px-8 py-12">
      <CourseGridSkeleton />
    </div>
  )
});

function CategoryCourseCard({ course }: { course: CourseSummary }): JSX.Element {
  const t = useT();

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video overflow-hidden bg-panel-warm">
        {course.coverImageUrl ? (
          <ResponsiveImage
            alt={course.title}
            className="h-full w-full object-cover"
            height={675}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            src={course.coverImageUrl}
            width={1200}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(96,99,238,0.18),transparent_55%),linear-gradient(135deg,rgba(27,27,31,0.04),rgba(96,99,238,0.1))]" />
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <CardTitle className="text-lg">{course.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          <RichTextContent html={course.description} />
        </CardDescription>
        <Link className="text-sm font-semibold text-accent" to="/courses/$slug" params={{ slug: course.slug }}>{t("cat.viewCourse")}</Link>
      </CardContent>
    </Card>
  );
}

function CategoryCoursesPage(): JSX.Element {
  const t = useT();

  const { category, courses } = Route.useLoaderData();

  return (
    <PublicLayout
      eyebrow={t("nav.categories")}
      subtitle={
        category.description ? (
          <RichTextContent className="text-muted" html={category.description} />
        ) : (
          t("cat.deeperLead")
        )
      }
      title={category.name}
    >
      {/* Same gutter as the page head above it. */}
      <PublicSection className="space-y-6">
        {category.children.length > 0 ? (
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t("cat.subcategories")}</CardTitle>
                <CardDescription>{t("cat.deeperLead")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {category.children.map((child: CategoryNode) => (
                  <Link
                    key={child.id}
                    className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-ink"
                    to="/categories/$slug"
                    params={{ slug: child.slug }}
                  >
                    {child.name}
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {courses.length === 0 ? (
          <p className="text-sm text-ink/68">{t("cat.noCourses")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course: CourseSummary) => (
              <div key={course.id}>
                <CategoryCourseCard course={course} />
              </div>
            ))}
          </div>
        )}
      </PublicSection>
    </PublicLayout>
  );
}
