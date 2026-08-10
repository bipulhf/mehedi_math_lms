import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Layers3 } from "lucide-react";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout, PublicSection } from "@/components/layout/public-layout";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { CategoryTreeSkeleton } from "@/components/common/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { itemListJsonLd, organizationJsonLd, seo } from "@/lib/seo";
import { ssrApiGet } from "@/lib/ssr-api";

export const Route = createFileRoute("/categories")({
  head: ({ loaderData }) => {
    const items = loaderData?.categoryItems ?? [];

    return seo({
      description:
        "Browse hierarchical math and science categories that organize every course in Mehedi's Math Academy.",
      jsonLd: [
        organizationJsonLd(),
        itemListJsonLd(
          "Academy categories",
          "Top-level category pathways for structured discovery.",
          items
        )
      ],
      path: "/categories",
      title: "Categories"
    });
  },
  loader: async () => {
    const tree = await ssrApiGet<CategoryNode[]>("/categories");

    return {
      categoryItems: tree.map((node) => ({ name: node.name, path: `/categories/${node.slug}` }))
    };
  },
  component: CategoriesPage,
  errorComponent: RouteErrorView,
  // Same chrome as the loaded page, or the header and footer appear only after
  // the loader resolves and the whole page jumps down.
  pendingComponent: () => (
    <PublicLayout>
      <PublicSection>
        <CategoryTreeSkeleton rows={8} />
      </PublicSection>
    </PublicLayout>
  )
});

/**
 * One top-level category, fully clickable regardless of whether it has
 * subjects under it — the old tree recursed a full bordered `Card` inside
 * every parent, so a level with five subjects was five nested cards deep and
 * a click on the parent itself did nothing at all. `courseCount` is already
 * the rollup (own courses plus every descendant's), so a level with no
 * courses tagged directly to it still shows the number that matters.
 */
function CategoryCard({ category }: { category: CategoryNode }): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-colors hover:border-line-strong">
      <Link
        className="flex flex-1 flex-col"
        params={{ slug: category.slug }}
        to="/categories/$slug"
      >
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-chip-active p-3 text-accent">
                <CategoryIcon
                  className="size-4"
                  fallback={<Layers3 className="size-4" />}
                  icon={category.icon}
                />
              </div>
              <CardTitle className="text-xl transition-colors group-hover:text-accent">
                {category.name}
              </CardTitle>
            </div>
            <span className="label-mono shrink-0 rounded-full bg-chip-active px-3 py-1 text-xs text-muted">
              {category.courseCount > 0
                ? t("cat.courseCount", { count: format.number(category.courseCount) })
                : t("cat.noCourseCount")}
            </span>
          </div>
          {category.description ? (
            <RichTextContent
              className="text-base font-light leading-relaxed text-muted"
              html={category.description}
            />
          ) : (
            <CardDescription>{t("cat.fallbackDescription")}</CardDescription>
          )}
        </CardHeader>
      </Link>

      {category.children.length > 0 ? (
        <CardContent className="mt-auto flex flex-wrap gap-2 border-t border-hairline-faint pt-4">
          {category.children.map((child) => (
            <Link
              className="rounded-full border border-hairline px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
              key={child.id}
              params={{ slug: child.slug }}
              to="/categories/$slug"
            >
              {child.name}
            </Link>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

function CategoriesPage(): JSX.Element {
  const t = useT();

  const { data: categories = [], isPending: isLoading } = useQuery<readonly CategoryNode[]>({
    queryFn: async () => listCategories(),
    queryKey: queryKeys.categories.list()
  });

  return (
    <PublicLayout
      subtitle={t("cat.exploreLead")}
      title={t("nav.categories")}
    >
      {/* PublicSection, not a bare div: the page head sits on the standard
          56px gutter and the body was running edge to edge under it. */}
      <PublicSection>
        {isLoading ? (
          <CategoryTreeSkeleton rows={6} />
        ) : categories.length === 0 ? (
          <EmptyState message={t("cat.dormant")} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard category={category} key={category.id} />
            ))}
          </div>
        )}
      </PublicSection>
    </PublicLayout>
  );
}
