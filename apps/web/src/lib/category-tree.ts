import type { CategoryNode } from "@/lib/api/categories";

export function findCategoryBySlug(
  nodes: readonly CategoryNode[],
  slug: string
): CategoryNode | null {
  for (const node of nodes) {
    if (node.slug === slug) {
      return node;
    }

    const nested = findCategoryBySlug(node.children, slug);

    if (nested) {
      return nested;
    }
  }

  return null;
}
