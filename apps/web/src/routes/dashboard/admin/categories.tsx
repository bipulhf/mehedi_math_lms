import { createFileRoute } from "@tanstack/react-router";
import { Layers3 } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import { FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { createCategorySchema } from "@mma/shared";

import { IconPicker } from "@/components/categories/icon-picker";

import { CategorySelector } from "@/components/categories/category-selector";
import { CategoryTree } from "@/components/categories/category-tree";
import { RouteErrorView } from "@/components/common/route-error";
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
  const formRef = useRef<HTMLFormElement>(null);
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
    return (
      <div className="space-y-8">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
          <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
          <Skeleton className="h-4 w-full max-w-sm bg-surface-container-highest mb-8" />
          <div className="grid gap-8 xl:grid-cols-2">
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16 bg-surface-container-highest" />
                  <Skeleton className="h-12 w-full bg-surface-container-highest rounded-2xl" />
                </div>
              ))}
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full bg-surface-container-highest rounded-2xl" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="size-10 rounded-full bg-surface-container-highest" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3 bg-surface-container-highest" />
                    <Skeleton className="h-3 w-2/3 bg-surface-container-highest" />
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
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-5 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
        <div className="mb-8">
          <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            Category atelier
          </h3>
          <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
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
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                  >
                    Name
                  </Label>
                  <Input
                    id="category-name"
                    className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body"
                    error={errors.name?.message}
                    {...register("name")}
                  />
                </div>

                <IconPicker name="icon" error={errors.icon?.message} />

                <div className="space-y-3">
                  <Label
                    htmlFor="category-parent"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                  >
                    Parent category
                  </Label>
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
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="category-description"
                    className="min-h-24 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body"
                    error={errors.description?.message}
                    {...register("description")}
                  />
                </div>
                <div className="grid gap-6">
                  <div className="space-y-3">
                    <Label
                      htmlFor="category-sort-order"
                      className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                    >
                      Sort order
                    </Label>
                    <Input
                      id="category-sort-order"
                      type="number"
                      className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body"
                      error={errors.sortOrder?.message}
                      {...register("sortOrder", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="rounded-3xl bg-surface-container-low/50 border border-outline-variant/30 p-5 shadow-inner">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/80">
                          Visibility
                        </p>
                        <p className="text-[0.65rem] text-on-surface/50 font-light mt-1">
                          Hidden from public if inactive.
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-3 cursor-pointer group/toggle">
                        <input type="checkbox" className="sr-only peer" {...register("isActive")} />
                        <div className="relative w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                        <span className="text-xs font-bold uppercase tracking-tighter text-on-surface/70 peer-checked:text-secondary group-hover/toggle:text-on-surface transition-colors">
                          Active
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 rounded-2xl px-8 font-headline font-extrabold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                      className="h-12 rounded-2xl px-6 border-outline-variant/30 transition-all hover:bg-surface-container-high active:scale-95"
                    >
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </form>
            </FormProvider>
          </div>

          <div className="space-y-6">
            <div className="rounded-4xl bg-primary/5 border border-primary/10 p-6 sm:p-8 shadow-inner relative overflow-hidden group/tree-header">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none transition-colors group-hover/tree-header:bg-primary/20"></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 relative z-10">
                <div className="rounded-2xl bg-primary/10 p-4 text-primary shadow-sm border border-primary/10 w-fit">
                  <Layers3 className="size-6" />
                </div>
                <div>
                  <h5 className="font-headline text-xl font-extrabold text-on-surface tracking-tight leading-none">
                    Tree view
                  </h5>
                  <p className="mt-2 text-sm text-on-surface-variant font-light leading-relaxed">
                    Drag cards to reorganize the academic hierarchy.
                  </p>
                </div>
                {editingCategory && (
                  <Button
                    size="sm"
                    onClick={() => syncEditingForm(null)}
                    className="h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-bold transition-all ml-auto"
                  >
                    Add new domain
                  </Button>
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-3 relative z-10">
                <Badge
                  tone="green"
                  className="rounded-full px-4 py-1.5 font-bold text-[0.65rem] border border-green-500/20 shadow-sm"
                >
                  {categories.length} root domains
                </Badge>
                <Badge
                  tone="blue"
                  className="rounded-full px-4 py-1.5 font-bold text-[0.65rem] border border-blue-500/20 shadow-sm"
                >
                  {flattenCategoryIds(categories).length} total nodes
                </Badge>
              </div>
            </div>

            <div className="bg-surface-container-low/30 rounded-4xl p-2 border border-outline-variant/10 shadow-inner min-h-125">
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
