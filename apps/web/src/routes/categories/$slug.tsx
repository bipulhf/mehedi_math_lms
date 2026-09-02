import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { CategoryIcon } from "@/components/categories/category-icon";
import { CourseGridSkeleton } from "@/components/courses/course-card";
import { PublicLayout, PublicSection } from "@/components/layout/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { CategoryNode } from "@/lib/api/categories";
import type { CourseSummary } from "@/lib/api/courses";
import { findCategoryBySlug } from "@/lib/category-tree";
import { breadcrumbJsonLd, catalogItemListFromCourses, seo } from "@/lib/seo";
import { SsrNotFoundError, ssrApiGet, ssrApiGetCourses } from "@/lib/ssr-api";
import { stripHtml } from "@/lib/html";
import { siteConfig } from "@/lib/site";
import { useFormat, useT } from "@/lib/i18n/locale-context";

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

    // A course is tagged to exactly one category, almost always a subject
    // leaf rather than its parent level — so a level page that only asked
    // for `categoryId: category.id` was correct-looking code that always
    // returned zero courses the moment a category had children. Fan out
    // across the category and every direct child instead; the tree is two
    // levels deep in practice, so this is at most a handful of requests.
    const categoryIds = [category.id, ...category.children.map((child) => child.id)];
    const courseLists = await Promise.all(
      categoryIds.map((categoryId) =>
        ssrApiGetCourses({ categoryId, limit: 48, page: 1, status: "PUBLISHED" })
      )
    );
    const courses = courseLists.flatMap((result) => result.data).slice(0, 48);

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
  errorComponent: RouteErrorView,
  pendingComponent: () => (
    <PublicLayout>
      <PublicSection>
        <CourseGridSkeleton className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" />
      </PublicSection>
    </PublicLayout>
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
          <div className="h-full w-full bg-placeholder-fill" />
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <CardTitle className="text-lg">{course.title}</CardTitle>
        <RichTextContent
          className="line-clamp-2 text-base font-light leading-relaxed text-muted"
          html={course.description}
        />
        <Link className="text-sm font-semibold text-accent" to="/courses/$slug" params={{ slug: course.slug }}>{t("cat.viewCourse")}</Link>
      </CardContent>
    </Card>
  );
}

function CategoryCoursesPage(): JSX.Element {
  const t = useT();
  const format = useFormat();

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
      title={
        <span className="inline-flex items-center gap-3">
          <CategoryIcon className="size-7 text-accent" icon={category.icon} />
          {category.name}
        </span>
      }
    >
      {/* Same gutter as the page head above it. */}
      <PublicSection className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton to="/categories" />
          <span className="label-mono rounded-full bg-chip-active px-3 py-1 text-xs text-muted">
            {category.courseCount > 0
              ? t("cat.courseCount", { count: format.number(category.courseCount) })
              : t("cat.noCourseCount")}
          </span>
        </div>

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
                    className="flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
                    to="/categories/$slug"
                    params={{ slug: child.slug }}
                  >
                    {child.name}
                    <span className="label-mono text-xs font-normal text-muted-faint">
                      {format.number(child.courseCount)}
                    </span>
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
