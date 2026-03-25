import { Link, createFileRoute } from "@tanstack/react-router";
import { Layers3 } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout } from "@/components/layout/public-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import { siteConfig } from "@/lib/site";

export const Route = createFileRoute("/categories" as never)({
  head: () => ({
    meta: [
      {
        title: `${siteConfig.name} | Category Browser`
      }
    ]
  }),
  component: CategoriesPage,
  errorComponent: RouteErrorView
} as never);

function PublicCategoryTree({
  categories,
  depth = 0
}: {
  categories: readonly CategoryNode[];
  depth?: number;
}): JSX.Element {
  return (
    <div className="space-y-4">
      {categories.map((category, index) => (
        <FadeIn key={category.id} delayClassName={index > 0 ? "delay-75" : undefined}>
          <Card className="bg-surface-container-low p-1">
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-lowest">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full bg-surface-container-highest p-3 text-secondary-container">
                    <Layers3 className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                    <CardDescription>{category.description ?? "Structured academic grouping for focused course discovery."}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4" style={{ marginLeft: `${depth * 1.5}rem` }}>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">/{category.slug}</Badge>
                  {category.children.length > 0 ? (
                    <Badge tone="violet">{category.children.length} subcategories</Badge>
                  ) : null}
                </div>
                {category.children.length > 0 ? (
                  <PublicCategoryTree categories={category.children} depth={depth + 1} />
                ) : (
                  <Link className="text-sm font-semibold text-secondary-container" to="/">
                    Courses will branch into this category in the upcoming course catalog phases.
                  </Link>
                )}
              </CardContent>
            </div>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}

function CategoriesPage(): JSX.Element {
  const [categories, setCategories] = useState<readonly CategoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const nextCategories = await listCategories();
        setCategories(nextCategories);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <PublicLayout
      eyebrow="Academic pathways"
      title="Explore the academy by structured category."
      subtitle="Browse the high-level academic map before drilling into course-level detail in the next phases."
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <PublicCategoryTree categories={categories} />
      )}
    </PublicLayout>
  );
}
