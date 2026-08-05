import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Layers3 } from "lucide-react";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout, PublicSection } from "@/components/layout/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { CategoryTreeSkeleton } from "@/components/common/skeletons";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import { queryKeys } from "@/lib/query/keys";
import { itemListJsonLd, organizationJsonLd, seo } from "@/lib/seo";
import { ssrApiGet } from "@/lib/ssr-api";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/categories")({
  head: ({ loaderData }) => {
    const items = loaderData?.categoryItems ?? [];

    return seo({
      description:
        "Browse hierarchical math and science categories that organize every course in Genex.",
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

function PublicCategoryTree({
  categories,
  depth = 0
}: {
  categories: readonly CategoryNode[];
  depth?: number;
}): JSX.Element {
  const t = useT();

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category.id}>
          {/* Square, like every other card. The inner panel is what carries
              the nesting, so the outer card is a 1px frame around it. */}
          <Card className="bg-panel-warm p-1">
            <div className="bg-card">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full bg-chip-active p-3 text-accent">
                    <Layers3 className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                    <CardDescription>
                      {category.description ? (
                        <RichTextContent html={category.description} />
                      ) : (
                        "Structured academic grouping for focused course discovery."
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.children.length > 0 ? (
                  <PublicCategoryTree categories={category.children} depth={depth + 1} />
                ) : (
                  <Link
                    className="text-base text-accent"
                    to="/categories/$slug"
                    params={{ slug: category.slug }}
                  >
                    {t("cat.viewCourses")} →
                  </Link>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      ))}
    </div>
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
        ) : (
          <PublicCategoryTree categories={categories} />
        )}
      </PublicSection>
    </PublicLayout>
  );
}
