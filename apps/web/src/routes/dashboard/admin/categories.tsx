import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Plus, Search, Sparkles } from "lucide-react";
import type { JSX } from "react";
import { useMemo, useState, useRef } from "react";
import { FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { createCategorySchema } from "@genex/shared";

import { IconPicker } from "@/components/categories/icon-picker";

import { CategorySelector } from "@/components/categories/category-selector";
import { CategoryTree } from "@/components/categories/category-tree";
import { RouteErrorView } from "@/components/common/route-error";
import { CategoryTreeSkeleton } from "@/components/common/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/categories")({
  component: AdminCategoriesPage,
  errorComponent: RouteErrorView
} as never);

function filterCategoryTree(
  items: readonly CategoryNode[],
  query: string
): readonly CategoryNode[] {
  if (!query.trim()) {
    return items;
  }
  const q = query.toLowerCase().trim();

  return items
    .map((item) => {
      const matchesSelf =
        item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
      const filteredChildren = filterCategoryTree(item.children, query);
      if (matchesSelf || filteredChildren.length > 0) {
        return {
          ...item,
          children: matchesSelf ? item.children : filteredChildren
        };
      }
      return null;
    })
    .filter((item): item is CategoryNode => item !== null);
}

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
  const t = useT();

  const queryClient = useQueryClient();
  const { data: categories = [], isPending: isLoading } = useQuery({
    queryFn: async () => listCategories({ includeInactive: true }),
    queryKey: queryKeys.categories.list({ includeInactive: true })
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);
  const form = useZodForm<CreateCategoryInput>({
    defaultValues: {
      description: "",
      icon: "",
      isActive: true,
      name: "",
      parentId: "",
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

  const filteredCategories = useMemo(
    () => filterCategoryTree(categories, searchQuery),
    [categories, searchQuery]
  );

  const availableParentCategories = useMemo(() => {
    if (!editingCategory) {
      return categories;
    }

    const excludedIds = new Set([
      editingCategory.id,
      ...flattenCategoryIds(editingCategory.children)
    ]);

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
    await queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() });
  };

  const syncEditingForm = (category: CategoryNode | null): void => {
    setEditingCategory(category);
    reset({
      description: category?.description ?? "",
      icon: category?.icon ?? "",
      isActive: category?.isActive ?? true,
      name: category?.name ?? "",
      parentId: category?.parentId ?? "",
      sortOrder: category?.sortOrder ?? 0
    });

    if (category) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }
  };

  const handleAddSubcategory = (parent: CategoryNode): void => {
    setEditingCategory(null);
    reset({
      description: "",
      icon: "",
      isActive: true,
      name: "",
      parentId: parent.id,
      sortOrder: parent.children.length
    });
    toast.info(`Parent category set to "${parent.name}"`);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values);
        toast.success(t("admin.cat.updated"));
      } else {
        await createCategory(values);
        toast.success(t("admin.cat.created"));
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
    toast.success(t("admin.cat.deleted"));

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
    queryClient.setQueryData(queryKeys.categories.list({ includeInactive: true }), nextTree);
    await reorderCategories({
      items: serializeCategoryTree(nextTree, null)
    });
    toast.success(t("admin.cat.reordered"));
    await loadCategories();
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="border border-hairline bg-card p-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="mb-8 h-4 w-full max-w-sm" />
          <div className="grid gap-8 xl:grid-cols-2">
            <CategoryTreeSkeleton rows={6} />
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="flex gap-4" key={i}>
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border border-hairline bg-card p-8 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-medium text-ink">{t("admin.cat.title")}</h1>
            <p className="mt-1 text-base font-light text-muted">
              Organize course taxonomy, manage root levels and subject subcategories.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="neutral">{categories.length} root levels</Badge>
            <Badge tone="neutral">{flattenCategoryIds(categories).length} total categories</Badge>
          </div>
        </div>
      </div>

      {/* 2-Column Main Workspace */}
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Form Column */}
        <div className="self-start xl:sticky xl:top-8">
          <div className="border border-hairline bg-card p-6 sm:p-8">
            {/* Mode Indicator Banner */}
            <div className="mb-6 flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                <h2 className="text-lg font-medium text-ink">
                  {editingCategory ? t("admin.cat.editingHeader") : t("admin.cat.creatingHeader")}
                </h2>
              </div>
              {editingCategory ? (
                <Button
                  onClick={() => syncEditingForm(null)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ArrowLeft className="mr-1.5 size-3.5" />
                  {t("admin.cat.cancelEdit")}
                </Button>
              ) : null}
            </div>

            <FormProvider {...form}>
              <form className="space-y-6" ref={formRef} onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="category-name">{t("common.name")}</Label>
                  <Input
                    error={errors.name?.message}
                    id="category-name"
                    placeholder="e.g. Higher Mathematics"
                    {...register("name")}
                  />
                </div>

                <IconPicker error={errors.icon?.message} name="icon" />

                <div className="space-y-2">
                  <Label htmlFor="category-parent">{t("admin.cat.parent")}</Label>
                  <CategorySelector
                    categories={availableParentCategories}
                    error={errors.parentId?.message}
                    id="category-parent"
                    onChange={(value) =>
                      setValue("parentId", value, { shouldDirty: true, shouldValidate: true })
                    }
                    value={selectedParentId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-description">{t("common.description")}</Label>
                  <Textarea
                    error={errors.description?.message}
                    id="category-description"
                    rows={3}
                    {...register("description")}
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category-sort-order">{t("admin.cat.sortOrder")}</Label>
                    <Input
                      error={errors.sortOrder?.message}
                      id="category-sort-order"
                      type="number"
                      {...register("sortOrder", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("admin.cat.visibility")}</Label>
                    <div className="flex h-10 items-center justify-between border border-hairline bg-panel-warm px-4">
                      <span className="text-sm font-light text-muted">Active in catalog</span>
                      <input
                        className="size-4 accent-accent"
                        type="checkbox"
                        {...register("isActive")}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" disabled={isSubmitting} size="lg" type="submit">
                    {isSubmitting
                      ? t("common.loading")
                      : editingCategory
                        ? "Save Changes"
                        : t("admin.cat.add")}
                  </Button>
                  {editingCategory ? (
                    <Button
                      onClick={() => syncEditingForm(null)}
                      size="lg"
                      type="button"
                      variant="outline"
                    >
                      {t("common.cancel")}
                    </Button>
                  ) : null}
                </div>
              </form>
            </FormProvider>
          </div>
        </div>

        {/* Tree Column */}
        <div className="space-y-6">
          <div className="border border-hairline bg-card p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-medium text-ink">{t("admin.cat.treeTitle")}</h2>
                <p className="text-sm font-light text-muted">{t("admin.cat.treeLead")}</p>
              </div>
              <Button onClick={() => syncEditingForm(null)} size="sm" type="button">
                <Plus className="mr-1.5 size-4" />
                {t("admin.cat.add")}
              </Button>
            </div>

            {/* Quick Search Filter */}
            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-faint" />
              <Input
                className="pl-10"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("admin.cat.searchPlaceholder")}
                value={searchQuery}
              />
            </div>

            {/* Tree View */}
            {filteredCategories.length === 0 ? (
              <EmptyState className="my-8" message={t("admin.cat.noResults")} />
            ) : (
              <CategoryTree
                categories={filteredCategories}
                draggedCategoryId={draggedCategoryId}
                editingCategoryId={editingCategory?.id}
                onAddSubcategory={handleAddSubcategory}
                onDelete={(category) => void handleDelete(category)}
                onDragCategory={setDraggedCategoryId}
                onDropOnCategory={(targetParentId) => void handleDropOnCategory(targetParentId)}
                onEdit={syncEditingForm}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
