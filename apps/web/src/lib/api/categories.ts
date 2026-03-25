import {
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema
} from "@mma/shared";
import type { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";

export interface CategoryNode {
  children: readonly CategoryNode[];
  createdAt: string;
  description: string | null;
  icon: string | null;
  id: string;
  isActive: boolean;
  name: string;
  parentId: string | null;
  slug: string;
  sortOrder: number;
  updatedAt: string;
}

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

function buildQueryString(query: Record<string, string | boolean | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

export async function getPublicCategoryBySlug(slug: string): Promise<CategoryNode> {
  const response = await apiGet<CategoryNode>(`categories/by-slug/${encodeURIComponent(slug)}`);

  return response.data;
}

export async function listCategories(query?: {
  flat?: boolean | undefined;
  includeInactive?: boolean | undefined;
}): Promise<readonly CategoryNode[]> {
  const response = await apiGet<readonly CategoryNode[]>(
    `categories${buildQueryString({
      flat: query?.flat,
      includeInactive: query?.includeInactive
    })}`
  );

  return response.data;
}

export async function getCategory(id: string): Promise<CategoryNode> {
  const response = await apiGet<CategoryNode>(`categories/${id}`);

  return response.data;
}

export async function createCategory(values: CreateCategoryInput): Promise<CategoryNode> {
  const response = await apiPost<CreateCategoryInput, CategoryNode>("categories", values);

  return response.data;
}

export async function updateCategory(id: string, values: UpdateCategoryInput): Promise<CategoryNode> {
  const response = await apiPut<UpdateCategoryInput, CategoryNode>(`categories/${id}`, values);

  return response.data;
}

export async function reorderCategories(values: ReorderCategoriesInput): Promise<readonly CategoryNode[]> {
  const response = await apiPatch<ReorderCategoriesInput, readonly CategoryNode[]>("categories/reorder", values);

  return response.data;
}

export async function deleteCategory(id: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`categories/${id}`);

  return response.data;
}
