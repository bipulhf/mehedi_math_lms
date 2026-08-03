import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Sparkles, X } from "lucide-react";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { createCategorySchema } from "@genex/shared";

import { IconPicker } from "@/components/categories/icon-picker";
import { CategorySelector } from "@/components/categories/category-selector";
import { CategoryTree } from "@/components/categories/category-tree";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const openCreateModal = (parentCategory?: CategoryNode): void => {
    setEditingCategory(null);
    reset({
      description: "",
      icon: "",
      isActive: true,
      name: "",
      parentId: parentCategory?.id ?? "",
      sortOrder: parentCategory ? parentCategory.children.length : categories.length
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: CategoryNode): void => {
    setEditingCategory(category);
    reset({
      description: category.description ?? "",
      icon: category.icon ?? "",
      isActive: category.isActive ?? true,
      name: category.name ?? "",
      parentId: category.parentId ?? "",
      sortOrder: category.sortOrder ?? 0
    });
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingCategory(null);
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

      closeModal();
      await loadCategories();
    } finally {
      setIsSubmitting(false);
    }
  });

  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const executeDelete = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      toast.success(t("admin.cat.deleted"));

      if (editingCategory?.id === deleteTarget.id) {
        closeModal();
      }

      setDeleteTarget(null);
      await loadCategories();
    } finally {
      setIsDeleting(false);
    }
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
      <div className="space-y-6">
        <div className="border border-hairline bg-card p-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Page Header Card */}
      <div className="border border-hairline bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-medium text-ink">{t("admin.cat.title")}</h1>
            <p className="mt-0.5 text-sm font-light text-muted">
              Organize course taxonomy, root subjects, and academic levels in one clear view.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">{categories.length} Root Domains</Badge>
            <Badge tone="neutral">{flattenCategoryIds(categories).length} Categories</Badge>
          </div>
        </div>
      </div>

      {/* Main Single Stream Category Workspace */}
      <div className="border border-hairline bg-card p-6 sm:p-8">
        {/* Unified Search & Action Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-faint" />
            <Input
              className="pl-10"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("admin.cat.searchPlaceholder")}
              value={searchQuery}
            />
          </div>
          <Button onClick={() => openCreateModal()} size="lg" type="button">
            <Plus className="mr-2 size-4" />
            {t("admin.cat.add")}
          </Button>
        </div>

        {/* Taxonomy Tree View */}
        {filteredCategories.length === 0 ? (
          <EmptyState className="my-12" message={t("admin.cat.noResults")} />
        ) : (
          <CategoryTree
            categories={filteredCategories}
            draggedCategoryId={draggedCategoryId}
            editingCategoryId={editingCategory?.id}
            onAddSubcategory={(parent) => openCreateModal(parent)}
            onDelete={(category) => setDeleteTarget(category)}
            onDragCategory={setDraggedCategoryId}
            onDropOnCategory={(targetParentId) => void handleDropOnCategory(targetParentId)}
            onEdit={(category) => openEditModal(category)}
          />
        )}
      </div>

      {/* Dead-Simple Focused Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in">
          <div
            className="relative w-full max-w-lg border border-hairline bg-card p-8 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-accent" />
                <h2 className="text-xl font-medium text-ink">
                  {editingCategory
                    ? `${t("admin.cat.editingHeader")}: ${editingCategory.name}`
                    : t("admin.cat.creatingHeader")}
                </h2>
              </div>
              <button
                className="p-1 text-muted hover:text-ink transition-colors"
                onClick={closeModal}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Form */}
            <FormProvider {...form}>
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="cat-name">{t("common.name")}</Label>
                  <Input
                    error={errors.name?.message}
                    id="cat-name"
                    placeholder="e.g. Higher Mathematics"
                    {...register("name")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cat-parent">{t("admin.cat.parent")}</Label>
                  <CategorySelector
                    categories={availableParentCategories}
                    error={errors.parentId?.message}
                    id="cat-parent"
                    onChange={(value) =>
                      setValue("parentId", value, { shouldDirty: true, shouldValidate: true })
                    }
                    value={selectedParentId}
                  />
                </div>

                <IconPicker error={errors.icon?.message} name="icon" />

                <div className="space-y-2">
                  <Label htmlFor="cat-description">{t("common.description")}</Label>
                  <Textarea
                    error={errors.description?.message}
                    id="cat-description"
                    rows={2}
                    {...register("description")}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cat-sort">{t("admin.cat.sortOrder")}</Label>
                    <Input
                      error={errors.sortOrder?.message}
                      id="cat-sort"
                      type="number"
                      {...register("sortOrder", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("admin.cat.visibility")}</Label>
                    <div className="flex h-10 items-center justify-between border border-hairline bg-panel-warm px-4">
                      <span className="text-sm font-light text-muted">Active</span>
                      <input
                        className="size-4 accent-accent"
                        type="checkbox"
                        {...register("isActive")}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex gap-3 pt-4 border-t border-hairline">
                  <Button className="flex-1" disabled={isSubmitting} size="lg" type="submit">
                    {isSubmitting
                      ? t("common.loading")
                      : editingCategory
                        ? "Save Changes"
                        : t("admin.cat.add")}
                  </Button>
                  <Button onClick={closeModal} size="lg" type="button" variant="outline">
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            </FormProvider>
          </div>
        </div>
      )}

      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        dangerous
        confirmLabel="Delete"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? Courses in this category keep their category, but the category itself is removed.`
            : ""
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void executeDelete()}
        open={deleteTarget !== null}
        pending={isDeleting}
        title="Delete category"
      />
    </div>
  );
}
