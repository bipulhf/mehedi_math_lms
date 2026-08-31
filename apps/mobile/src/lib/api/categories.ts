import { apiGet } from "@/src/lib/api-client";

/** The category tree the Explore filters are built from. */

export interface CategoryNode {
  children: readonly CategoryNode[];
  id: string;
  name: string;
  slug: string;
}

export async function listCategories(): Promise<readonly CategoryNode[]> {
  return apiGet<readonly CategoryNode[]>("categories");
}
