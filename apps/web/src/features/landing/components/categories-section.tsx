import { Link } from "@tanstack/react-router";
import { Layers3 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { JSX } from "react";

import type { LandingCategory } from "@/lib/api/landing";

function CategoryIcon({ name }: { name: string | null }): JSX.Element {
  const icons = LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>;
  const Icon = icons[name ?? ""] ?? Layers3;

  return (
    <Icon className="size-10 mb-8 text-primary group-hover:scale-110 transition-transform block" />
  );
}

export function CategoriesSection({
  categories
}: {
  categories: readonly LandingCategory[];
}): JSX.Element | null {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-32 px-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-16">
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-[0.2em] text-secondary uppercase">
            Foundations &amp; Beyond
          </p>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">Curated Categories</h2>
        </div>
        <Link
          to="/categories"
          className="text-sm font-headline font-bold border-b-2 border-primary pb-1 hover:text-secondary hover:border-secondary transition-all"
        >
          View Full Catalog
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            to="/categories/$slug"
            params={{ slug: category.slug }}
            className="group bg-surface hover:bg-surface-container-lowest p-10 rounded-3xl border border-outline-variant/10 transition-all duration-300"
          >
            <CategoryIcon name={category.icon} />
            <h4 className="text-lg font-headline font-bold mb-2">{category.name}</h4>
            <p className="text-xs text-on-surface-variant font-light">
              {category.description ??
                `${category.courseCount} ${category.courseCount === 1 ? "course" : "courses"} published.`}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
