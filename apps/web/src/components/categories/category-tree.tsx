import { GripVertical, Pencil, Trash2, Layers3 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { DragEvent, JSX } from "react";

import type { CategoryNode } from "@/lib/api/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CategoryTreeProps {
  categories: readonly CategoryNode[];
  draggedCategoryId: string | null;
  editingCategoryId?: string | null | undefined;
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
  onDelete,
  onDragCategory,
  onDropOnCategory,
  onEdit
}: CategoryTreeItemProps): JSX.Element {
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
          "rounded-4xl border border-outline-variant/40 bg-surface-container-lowest/80 backdrop-blur-3xl p-5 sm:p-6 transition-all duration-300 ease-out group/tree-item shadow-sm hover:shadow-md hover:border-primary/20",
          draggedCategoryId === category.id && "opacity-50 scale-[0.98]",
          editingCategoryId === category.id && "ring-2 ring-primary border-primary/40 bg-primary/5"
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
            <div className="mt-1 size-10 flex items-center justify-center rounded-2xl bg-surface-container-high border border-outline-variant/20 text-on-surface/40 group-hover/tree-item:text-primary transition-colors cursor-grab active:cursor-grabbing shadow-inner">
              <GripVertical className="size-5" />
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {IconComp && (
                  <IconComp className="size-5 text-primary animate-in fade-in zoom-in duration-500" />
                )}
                <p className="font-headline font-extrabold text-on-surface text-lg tracking-tight">
                  {category.name}
                </p>
                <Badge
                  tone={category.isActive ? "green" : "red"}
                  className="rounded-full px-3 py-0.5 text-[0.65rem] font-bold tracking-widest uppercase"
                >
                  {category.isActive ? "Active" : "Archived"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] font-bold text-primary/40 uppercase tracking-widest">
                  Identifier:
                </span>
                <p className="font-mono text-[0.7rem] text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-lg border border-outline-variant/10">
                  /{category.slug}
                </p>
              </div>
              {category.description ? (
                <p className="max-w-xl text-sm leading-relaxed text-on-surface-variant font-light line-clamp-2">
                  {category.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onEdit(category)}
              className="h-10 rounded-xl px-4 font-bold text-xs border-outline-variant/30 hover:bg-primary/5 hover:text-primary transition-all active:scale-95 flex-1 sm:flex-initial"
            >
              <Pencil className="size-3.5 mr-2" />
              Modify
            </Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => onDelete(category)}
              className="h-10 rounded-xl px-4 font-bold text-xs text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all active:scale-95 flex-1 sm:flex-initial"
            >
              <Trash2 className="size-3.5 mr-2" />
              Discard
            </Button>
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
  onDelete,
  onDragCategory,
  onDropOnCategory,
  onEdit
}: CategoryTreeProps): JSX.Element {
  return (
    <div
      className="space-y-6 rounded-4xl bg-surface-container-low/30 p-4 sm:p-6 border border-outline-variant/10 shadow-inner min-h-125 [--depth-gap:0.5rem] sm:[--depth-gap:1.5rem] lg:[--depth-gap:2.5rem]"
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
              key={category.id}
              category={category}
              depth={0}
              draggedCategoryId={draggedCategoryId}
              editingCategoryId={editingCategoryId}
              onDelete={onDelete}
              onDragCategory={onDragCategory}
              onDropOnCategory={onDropOnCategory}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-4xl bg-surface-container-lowest/40 border border-outline-variant/20 p-12 text-center animate-in fade-in zoom-in duration-500">
          <Layers3 className="size-12 mx-auto mb-4 opacity-10" />
          <p className="text-sm font-light italic text-on-surface/40">
            The academic tree is currently dormant.
          </p>
        </div>
      )}
    </div>
  );
}
