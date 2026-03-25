import type { UserRole } from "@mma/shared";
import type { z } from "zod";
import {
  categoriesQuerySchema,
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema
} from "@mma/shared";

import {
  CategoryRepository,
  type CategoryRecord
} from "@/repositories/category-repository";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

type CategoriesQuery = z.infer<typeof categoriesQuerySchema>;
type CreateCategoryInput = z.infer<typeof createCategorySchema>;
type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

export interface CategoryTreeNode {
  children: readonly CategoryTreeNode[];
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

function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function createSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `category-${crypto.randomUUID().slice(0, 8)}`
  );
}

function mapNode(record: CategoryRecord, children: readonly CategoryTreeNode[]): CategoryTreeNode {
  return {
    children,
    createdAt: record.createdAt.toISOString(),
    description: record.description,
    icon: record.icon,
    id: record.id,
    isActive: record.isActive,
    name: record.name,
    parentId: record.parentId,
    slug: record.slug,
    sortOrder: record.sortOrder,
    updatedAt: record.updatedAt.toISOString()
  };
}

function buildTree(records: readonly CategoryRecord[], parentId: string | null): readonly CategoryTreeNode[] {
  return records
    .filter((record) => record.parentId === parentId)
    .map((record) => mapNode(record, buildTree(records, record.id)));
}

export class CategoryService {
  public constructor(private readonly categoryRepository: CategoryRepository) {}

  public async listCategories(
    query: CategoriesQuery,
    requesterRole?: UserRole | undefined
  ): Promise<readonly CategoryTreeNode[]> {
    const categories = await this.categoryRepository.list();
    const shouldIncludeInactive = query.includeInactive && requesterRole === "ADMIN";
    const visibleCategories = shouldIncludeInactive ? categories : categories.filter((category) => category.isActive);

    if (query.flat) {
      return visibleCategories.map((category) => mapNode(category, []));
    }

    return buildTree(visibleCategories, null);
  }

  public async getCategoryById(id: string): Promise<CategoryTreeNode> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError("Category not found");
    }

    return mapNode(category, []);
  }

  public async createCategory(input: CreateCategoryInput): Promise<CategoryTreeNode> {
    const slug = normalizeOptionalString(input.slug) ?? createSlug(input.name);
    const existingCategory = await this.categoryRepository.findBySlug(slug);

    if (existingCategory) {
      throw new ConflictError("A category with this slug already exists");
    }

    const parentId = normalizeOptionalString(input.parentId);

    if (parentId) {
      const parentCategory = await this.categoryRepository.findById(parentId);

      if (!parentCategory) {
        throw new ValidationError("Parent category not found", [
          {
            field: "parentId",
            message: "Parent category does not exist"
          }
        ]);
      }
    }

    const createdCategory = await this.categoryRepository.create({
      description: normalizeOptionalString(input.description),
      icon: normalizeOptionalString(input.icon),
      isActive: input.isActive,
      name: input.name.trim(),
      parentId,
      slug,
      sortOrder: input.sortOrder
    });

    return mapNode(createdCategory, []);
  }

  public async updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryTreeNode> {
    const currentCategory = await this.categoryRepository.findById(id);

    if (!currentCategory) {
      throw new NotFoundError("Category not found");
    }

    const nextName = input.name?.trim() ?? currentCategory.name;
    const nextSlug = normalizeOptionalString(input.slug) ?? currentCategory.slug ?? createSlug(nextName);
    const existingSlugCategory = await this.categoryRepository.findBySlug(nextSlug);

    if (existingSlugCategory && existingSlugCategory.id !== id) {
      throw new ConflictError("A category with this slug already exists");
    }

    const nextParentId = input.parentId === undefined ? currentCategory.parentId : normalizeOptionalString(input.parentId);

    if (nextParentId === id) {
      throw new ValidationError("Category cannot be its own parent", [
        {
          field: "parentId",
          message: "Choose a different parent category"
        }
      ]);
    }

    if (nextParentId) {
      const allCategories = await this.categoryRepository.list();
      const parentCategory = allCategories.find((category) => category.id === nextParentId);

      if (!parentCategory) {
        throw new ValidationError("Parent category not found", [
          {
            field: "parentId",
            message: "Parent category does not exist"
          }
        ]);
      }

      let ancestorId = parentCategory.parentId;

      while (ancestorId) {
        if (ancestorId === id) {
          throw new ValidationError("Category hierarchy would create a loop", [
            {
              field: "parentId",
              message: "A category cannot become a child of its own descendant"
            }
          ]);
        }

        ancestorId = allCategories.find((category) => category.id === ancestorId)?.parentId ?? null;
      }
    }

    const updatedCategory = await this.categoryRepository.update(id, {
      description:
        input.description === undefined ? currentCategory.description : normalizeOptionalString(input.description),
      icon: input.icon === undefined ? currentCategory.icon : normalizeOptionalString(input.icon),
      isActive: input.isActive ?? currentCategory.isActive,
      name: nextName,
      parentId: nextParentId,
      slug: nextSlug,
      sortOrder: input.sortOrder ?? currentCategory.sortOrder
    });

    if (!updatedCategory) {
      throw new NotFoundError("Category not found");
    }

    return mapNode(updatedCategory, []);
  }

  public async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError("Category not found");
    }

    const [childCount, courseCount] = await Promise.all([
      this.categoryRepository.countChildren(id),
      this.categoryRepository.countCourses(id)
    ]);

    if (childCount > 0) {
      throw new ForbiddenError("Delete child categories before removing this parent category");
    }

    if (courseCount > 0) {
      throw new ForbiddenError("Categories attached to courses cannot be deleted");
    }

    await this.categoryRepository.delete(id);
  }

  public async reorderCategories(input: ReorderCategoriesInput): Promise<readonly CategoryTreeNode[]> {
    const allCategories = await this.categoryRepository.list();
    const categoryIds = new Set(allCategories.map((category) => category.id));
    const parentMap = new Map(allCategories.map((category) => [category.id, category.parentId]));

    for (const item of input.items) {
      if (!categoryIds.has(item.id)) {
        throw new NotFoundError("Category not found");
      }

      const normalizedParentId = normalizeOptionalString(item.parentId);

      if (normalizedParentId && !categoryIds.has(normalizedParentId)) {
        throw new ValidationError("Parent category not found", [
          {
            field: "items.parentId",
            message: "Parent category does not exist"
          }
        ]);
      }

      if (normalizedParentId === item.id) {
        throw new ValidationError("Category cannot be its own parent", [
          {
            field: "items.parentId",
            message: "Choose a different parent category"
          }
        ]);
      }

      parentMap.set(item.id, normalizedParentId);
    }

    for (const [categoryId, parentId] of parentMap.entries()) {
      let ancestorId = parentId;
      const visitedCategoryIds = new Set<string>([categoryId]);

      while (ancestorId) {
        if (visitedCategoryIds.has(ancestorId)) {
          throw new ValidationError("Category hierarchy would create a loop", [
            {
              field: "items.parentId",
              message: "A category cannot become a child of its own descendant"
            }
          ]);
        }

        visitedCategoryIds.add(ancestorId);
        ancestorId = parentMap.get(ancestorId) ?? null;
      }
    }

    await this.categoryRepository.reorder(
      input.items.map((item) => ({
        id: item.id,
        parentId: normalizeOptionalString(item.parentId),
        sortOrder: item.sortOrder
      }))
    );

    return this.listCategories({ flat: false, includeInactive: true }, "ADMIN");
  }
}
