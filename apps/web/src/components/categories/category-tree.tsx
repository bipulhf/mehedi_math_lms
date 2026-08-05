import { GripVertical, Pencil, Plus, Trash2, Layers3 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { DragEvent, JSX } from "react";

import type { CategoryNode } from "@/lib/api/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-context";

interface CategoryTreeProps {
  categories: readonly CategoryNode[];
  draggedCategoryId: string | null;
  editingCategoryId?: string | null | undefined;
  onAddSubcategory?: ((parent: CategoryNode) => void) | undefined;
  onDelete: (category: CategoryNode) => void;
  onDragCategory: (categoryId: string | null) => void;
  onDropOnCategory: (targetCategoryId: string | null) => void;
  onEdit: (category: CategoryNode) => void;
}

interface CategoryTreeItemProps extends Omit<CategoryTreeProps, "categories"> {
  category: CategoryNode;
  depth: number;
}

function CategoryTreeItem({
  category,
  depth,
  draggedCategoryId,
  editingCategoryId,
  onAddSubcategory,
  onDelete,
  onDragCategory,
  onDropOnCategory,
  onEdit
}: CategoryTreeItemProps): JSX.Element {
  const t = useT();

  const handleDragStart = (event: DragEvent<HTMLDivElement>): void => {
    event.dataTransfer.effectAllowed = "move";
    onDragCategory(category.id);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    onDropOnCategory(category.id);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  };

  const icons = LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>;
  const IconComp = icons[category.icon || ""] || null;

  return (
    <div className="space-y-3">
      <div
        draggable
        className={cn(
          "border border-hairline bg-card p-5 sm:p-6 transition-colors group/tree-item hover:border-line-strong",
          draggedCategoryId === category.id && "opacity-50 scale-[0.98]",
          editingCategoryId === category.id && "ring-2 ring-ink border-ink/40 bg-ink/5"
        )}
        style={{ 
          marginLeft: `calc(var(--depth-gap, 0.75rem) * ${depth})` 
        }}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onDragEnd={() => onDragCategory(null)}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="mt-1 size-10 flex items-center justify-center bg-chip-active border border-hairline/20 text-ink/40 group-hover/tree-item:text-ink transition-colors cursor-grab active:cursor-grabbing">
              <GripVertical className="size-5" />
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {IconComp && (
                  <IconComp className="size-5 text-ink" />
                )}
                <p className="font-body font-medium text-ink text-lg tracking-tight">
                  {category.name}
                </p>
                <Badge
                  tone={category.isActive ? "neutral" : "attention"}
                  className="rounded-full px-3 py-0.5 text-[0.65rem] font-bold tracking-widest uppercase"
                >
                  {category.isActive ? "Active" : "Archived"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] font-bold text-ink/40 uppercase tracking-widest">{t("cat.identifier")}</span>
                <p className="font-mono text-[0.7rem] text-muted bg-panel-warm px-2 py-0.5 rounded-lg border border-hairline/10">
                  /{category.slug}
                </p>
              </div>
              {category.description ? (
                <p className="max-w-xl text-sm leading-relaxed text-muted font-light line-clamp-2">
                  {category.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            {onAddSubcategory && (
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onAddSubcategory(category)}
                className="h-10 px-4 font-bold text-xs border-hairline/30 hover:bg-ink/5 hover:text-ink transition-all flex-1 sm:flex-initial"
              >
                <Plus className="size-3.5 mr-2" />{t("admin.cat.addSubcategory")}
              </Button>
            )}
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onEdit(category)}
              className="h-10 px-4 font-bold text-xs border-hairline/30 hover:bg-ink/5 hover:text-ink transition-all flex-1 sm:flex-initial"
            >
              <Pencil className="size-3.5 mr-2" />{t("common.modify")}</Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => onDelete(category)}
              className="h-10 px-4 font-bold text-xs text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all flex-1 sm:flex-initial"
            >
              <Trash2 className="size-3.5 mr-2" />{t("common.discard")}</Button>
          </div>
        </div>
      </div>

      {category.children.map((childCategory) => (
        <CategoryTreeItem
          key={childCategory.id}
          category={childCategory}
          depth={depth + 1}
          draggedCategoryId={draggedCategoryId}
          editingCategoryId={editingCategoryId}
          onAddSubcategory={onAddSubcategory}
          onDelete={onDelete}
          onDragCategory={onDragCategory}
          onDropOnCategory={onDropOnCategory}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

export function CategoryTree({
  categories,
  draggedCategoryId,
  editingCategoryId,
  onAddSubcategory,
  onDelete,
  onDragCategory,
  onDropOnCategory,
  onEdit
}: CategoryTreeProps): JSX.Element {
  const t = useT();

  return (
    <div
      className="min-h-125 space-y-6 border border-hairline/10 bg-panel-warm/30 p-4 sm:p-6 [--depth-gap:0.5rem] sm:[--depth-gap:1.5rem] lg:[--depth-gap:2.5rem]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropOnCategory(null);
      }}
    >
      {categories.length > 0 ? (
        <div className="space-y-4">
          {categories.map((category) => (
            <CategoryTreeItem
              category={category}
              depth={0}
              draggedCategoryId={draggedCategoryId}
              editingCategoryId={editingCategoryId}
              key={category.id}
              onAddSubcategory={onAddSubcategory}
              onDelete={onDelete}
              onDragCategory={onDragCategory}
              onDropOnCategory={onDropOnCategory}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <div className="border border-hairline/20 bg-card/40 p-6 sm:p-10 lg:p-12 text-center">
          <Layers3 className="mx-auto mb-4 size-12 opacity-10" />
          <p className="text-sm font-light italic text-ink/40">{t("cat.dormant")}</p>
        </div>
      )}
    </div>
  );
}
