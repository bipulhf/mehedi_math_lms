import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Layers3 } from "lucide-react";
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
    // Optimistic: the tree redraws in the dragged position before the round trip.
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
        <div className="bg-card/80 p-8 border border-hairline/40 relative w-full overflow-hidden">
          <Skeleton className="h-8 w-48 mb-4 bg-chip-active" />
          <Skeleton className="h-4 w-full max-w-sm bg-chip-active mb-8" />
          <div className="grid gap-8 xl:grid-cols-2">
            <CategoryTreeSkeleton rows={6} />
            <div className="space-y-6">
              <Skeleton className="h-32 w-full bg-chip-active" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="size-10 rounded-full bg-chip-active" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3 bg-chip-active" />
                    <Skeleton className="h-3 w-2/3 bg-chip-active" />
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
      <div className="bg-card/80 p-5 sm:p-10 border border-hairline/40 relative w-full overflow-hidden group">
        <div className="mb-8">
          <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("admin.cat.title")}</h3>
          <p className="mt-2 text-sm text-muted font-light max-w-2xl leading-relaxed">
            Build the academic taxonomy, shape parent-child relationships, and keep course browsing
            organized.
          </p>
        </div>

        <div className="grid gap-8 lg:gap-10 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="xl:sticky xl:top-8 self-start">
            <FormProvider {...form}>
              <form ref={formRef} className="space-y-6" onSubmit={onSubmit}>
                <div className="space-y-3">
                  <Label
                    htmlFor="category-name"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                  >{t("common.name")}</Label>
                  <Input
                    id="category-name"
                    className="h-12 bg-panel-warm/50 border-hairline/30 font-body"
                    error={errors.name?.message}
                    {...register("name")}
                  />
                </div>

                <IconPicker name="icon" error={errors.icon?.message} />

                <div className="space-y-3">
                  <Label
                    htmlFor="category-parent"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                  >{t("admin.cat.parent")}</Label>
                  <CategorySelector
                    id="category-parent"
                    categories={availableParentCategories}
                    error={errors.parentId?.message}
                    value={selectedParentId}
                    onChange={(value) =>
                      setValue("parentId", value, { shouldDirty: true, shouldValidate: true })
                    }
                  />
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="category-description"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                  >{t("common.description")}</Label>
                  <Textarea
                    id="category-description"
                    className="min-h-24 bg-panel-warm/50 border-hairline/30 font-body"
                    error={errors.description?.message}
                    {...register("description")}
                  />
                </div>
                <div className="grid gap-6">
                  <div className="space-y-3">
                    <Label
                      htmlFor="category-sort-order"
                      className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                    >{t("admin.cat.sortOrder")}</Label>
                    <Input
                      id="category-sort-order"
                      type="number"
                      className="h-12 bg-panel-warm/50 border-hairline/30 font-body"
                      error={errors.sortOrder?.message}
                      {...register("sortOrder", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="bg-panel-warm/50 border border-hairline/30 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/80">{t("admin.cat.visibility")}</p>
                        <p className="text-[0.65rem] text-ink/50 font-light mt-1">{t("admin.cat.hiddenNote")}</p>
                      </div>
                      <label className="inline-flex items-center gap-3 cursor-pointer group/toggle">
                        <input type="checkbox" className="sr-only peer" {...register("isActive")} />
                        <div className="relative w-11 h-6 bg-chip-active peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        <span className="text-xs font-bold uppercase tracking-tighter text-ink/70 peer-checked:text-accent group-hover/toggle:text-ink transition-colors">{t("admin.users.active")}</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 px-8 font-body font-medium transition-all ] ]"
                  >
                    {isSubmitting ? (
                      <Skeleton className="h-4 w-20 bg-white/20" />
                    ) : editingCategory ? (
                      "Update category"
                    ) : (
                      "Create category"
                    )}
                  </Button>
                  {editingCategory ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => syncEditingForm(null)}
                      className="h-12 px-6 border-hairline/30 transition-all hover:bg-chip-active"
                    >{t("common.cancel")}</Button>
                  ) : null}
                </div>
              </form>
            </FormProvider>
          </div>

          <div className="space-y-6">
            <div className="bg-ink/5 border border-ink/10 p-6 sm:p-8 relative overflow-hidden group/tree-header">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 relative z-10">
                <div className="bg-ink/10 p-4 text-ink border border-ink/10 w-fit">
                  <Layers3 className="size-6" />
                </div>
                <div>
                  <h5 className="font-body text-xl font-medium text-ink tracking-tight leading-none">{t("admin.cat.treeTitle")}</h5>
                  <p className="mt-2 text-sm text-muted font-light leading-relaxed">{t("admin.cat.treeLead")}</p>
                </div>
                {editingCategory && (
                  <Button
                    size="sm"
                    onClick={() => syncEditingForm(null)}
                    className="h-10 bg-ink/10 text-ink border border-ink/20 hover:bg-ink/20 font-bold transition-all ml-auto"
                  >{t("admin.cat.add")}</Button>
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-3 relative z-10">
                <Badge
                  tone="neutral"
                  className="rounded-full px-4 py-1.5 font-bold text-[0.65rem] border border-green-500/20"
                >
                  {categories.length} root domains
                </Badge>
                <Badge
                  tone="neutral"
                  className="rounded-full px-4 py-1.5 font-bold text-[0.65rem] border border-blue-500/20"
                >
                  {flattenCategoryIds(categories).length} total nodes
                </Badge>
              </div>
            </div>

            <div className="bg-panel-warm/30 p-2 border border-hairline/10 min-h-125">
              <CategoryTree
                categories={categories}
                draggedCategoryId={draggedCategoryId}
                editingCategoryId={editingCategory?.id}
                onDelete={(category) => void handleDelete(category)}
                onDragCategory={setDraggedCategoryId}
                onDropOnCategory={(targetParentId) => void handleDropOnCategory(targetParentId)}
                onEdit={syncEditingForm}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
