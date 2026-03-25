import { createFileRoute } from "@tanstack/react-router";
import { Layers3 } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createCategorySchema } from "@mma/shared";

import { CategorySelector } from "@/components/categories/category-selector";
import { CategoryTree } from "@/components/categories/category-tree";
import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryNode, CreateCategoryInput } from "@/lib/api/categories";
import {
  createCategory,
  deleteCategory,
  listCategories,
  reorderCategories,
  updateCategory
} from "@/lib/api/categories";
import { useZodForm } from "@/lib/forms/use-zod-form";

export const Route = createFileRoute("/dashboard/admin/categories" as never)({
  component: AdminCategoriesPage,
  errorComponent: RouteErrorView
} as never);

function flattenCategoryIds(categories: readonly CategoryNode[]): readonly string[] {
  return categories.flatMap((category) => [category.id, ...flattenCategoryIds(category.children)]);
}

function extractCategoryNode(
  categories: readonly CategoryNode[],
  categoryId: string
): { categories: readonly CategoryNode[]; extracted: CategoryNode | null } {
  let extractedCategory: CategoryNode | null = null;

  const nextCategories = categories
    .map((category) => {
      if (category.id === categoryId) {
        extractedCategory = {
          ...category,
          children: [...category.children]
        };

        return null;
      }

      const nestedResult = extractCategoryNode(category.children, categoryId);

      if (nestedResult.extracted) {
        extractedCategory = nestedResult.extracted;
      }

      return {
        ...category,
        children: nestedResult.categories
      };
    })
    .filter((category): category is CategoryNode => category !== null);

  return {
    categories: nextCategories,
    extracted: extractedCategory
  };
}

function insertCategoryNode(
  categories: readonly CategoryNode[],
  targetParentId: string | null,
  categoryToInsert: CategoryNode
): readonly CategoryNode[] {
  if (targetParentId === null) {
    return [...categories, { ...categoryToInsert }];
  }

  return categories.map((category) => {
    if (category.id === targetParentId) {
      return {
        ...category,
        children: [...category.children, { ...categoryToInsert }]
      };
    }

    return {
      ...category,
      children: insertCategoryNode(category.children, targetParentId, categoryToInsert)
    };
  });
}

function serializeCategoryTree(
  categories: readonly CategoryNode[],
  parentId: string | null
): CreateCategoryInput["sortOrder"] extends number
  ? Array<{ id: string; parentId: string; sortOrder: number }>
  : never {
  return categories.flatMap((category, index) => {
    const currentItem = {
      id: category.id,
      parentId: parentId ?? "",
      sortOrder: index
    };

    return [currentItem, ...serializeCategoryTree(category.children, category.id)];
  });
}

function AdminCategoriesPage(): JSX.Element {
  const [categories, setCategories] = useState<readonly CategoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);
  const form = useZodForm<CreateCategoryInput>({
    defaultValues: {
      description: "",
      icon: "",
      isActive: true,
      name: "",
      parentId: "",
      slug: "",
      sortOrder: 0
    },
    schema: createCategorySchema
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = form;
  const selectedParentId = watch("parentId") ?? "";

  const availableParentCategories = useMemo(() => {
    if (!editingCategory) {
      return categories;
    }

    const excludedIds = new Set([editingCategory.id, ...flattenCategoryIds(editingCategory.children)]);

    const filterCategories = (items: readonly CategoryNode[]): readonly CategoryNode[] =>
      items
        .filter((item) => !excludedIds.has(item.id))
        .map((item) => ({
          ...item,
          children: filterCategories(item.children)
        }));

    return filterCategories(categories);
  }, [categories, editingCategory]);

  const loadCategories = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const nextCategories = await listCategories({ includeInactive: true });
      setCategories(nextCategories);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const syncEditingForm = (category: CategoryNode | null): void => {
    setEditingCategory(category);
    reset({
      description: category?.description ?? "",
      icon: category?.icon ?? "",
      isActive: category?.isActive ?? true,
      name: category?.name ?? "",
      parentId: category?.parentId ?? "",
      slug: category?.slug ?? "",
      sortOrder: category?.sortOrder ?? 0
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values);
        toast.success("Category updated");
      } else {
        await createCategory(values);
        toast.success("Category created");
      }

      syncEditingForm(null);
      await loadCategories();
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleDelete = async (category: CategoryNode): Promise<void> => {
    if (!window.confirm(`Delete ${category.name}?`)) {
      return;
    }

    await deleteCategory(category.id);
    toast.success("Category deleted");

    if (editingCategory?.id === category.id) {
      syncEditingForm(null);
    }

    await loadCategories();
  };

  const handleDropOnCategory = async (targetParentId: string | null): Promise<void> => {
    if (!draggedCategoryId) {
      return;
    }

    const extractedResult = extractCategoryNode(categories, draggedCategoryId);

    if (!extractedResult.extracted) {
      return;
    }

    const nextTree = insertCategoryNode(extractedResult.categories, targetParentId, {
      ...extractedResult.extracted,
      parentId: targetParentId
    });

    setDraggedCategoryId(null);
    setCategories(nextTree);
    await reorderCategories({
      items: serializeCategoryTree(nextTree, null)
    });
    toast.success("Category order updated");
    await loadCategories();
  };

  if (isLoading) {
    return <DataTableSkeleton columns={4} rows={6} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Category atelier</CardTitle>
          <CardDescription>
            Build the academic taxonomy, shape parent-child relationships, and keep course browsing organized.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input id="category-name" error={errors.name?.message} {...register("name")} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-slug">Slug</Label>
                <Input id="category-slug" error={errors.slug?.message} {...register("slug")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-icon">Icon</Label>
                <Input id="category-icon" error={errors.icon?.message} {...register("icon")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-parent">Parent category</Label>
              <CategorySelector
                id="category-parent"
                categories={availableParentCategories}
                error={errors.parentId?.message}
                value={selectedParentId}
                onChange={(value) => setValue("parentId", value, { shouldDirty: true, shouldValidate: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea id="category-description" error={errors.description?.message} {...register("description")} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-sort-order">Sort order</Label>
                <Input
                  id="category-sort-order"
                  type="number"
                  error={errors.sortOrder?.message}
                  {...register("sortOrder", { valueAsNumber: true })}
                />
              </div>
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Visibility</p>
                    <p className="text-sm text-on-surface/62">Inactive categories stay hidden from public browsing.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-on-surface">
                    <input type="checkbox" {...register("isActive")} />
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <span className="h-4 w-16 rounded-full bg-white/25" aria-hidden="true" /> : null}
                {isSubmitting ? "Saving category" : editingCategory ? "Update category" : "Create category"}
              </Button>
              {editingCategory ? (
                <Button type="button" variant="outline" onClick={() => syncEditingForm(null)}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>

          <div className="space-y-4">
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-surface-container-highest p-3 text-secondary-container">
                  <Layers3 className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">Tree view</p>
                  <p className="text-sm text-on-surface/62">
                    Drag cards into the top-level canvas or onto another category to reorganize the hierarchy.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="green">{categories.length} root categories</Badge>
                <Badge tone="blue">{flattenCategoryIds(categories).length} total categories</Badge>
              </div>
            </div>

            <CategoryTree
              categories={categories}
              draggedCategoryId={draggedCategoryId}
              onDelete={(category) => void handleDelete(category)}
              onDragCategory={setDraggedCategoryId}
              onDropOnCategory={(targetParentId) => void handleDropOnCategory(targetParentId)}
              onEdit={syncEditingForm}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
