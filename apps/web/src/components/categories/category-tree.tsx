import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { DragEvent, JSX } from "react";

import type { CategoryNode } from "@/lib/api/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CategoryTreeProps {
  categories: readonly CategoryNode[];
  draggedCategoryId: string | null;
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

  return (
    <div className="space-y-3">
      <div
        draggable
        className={[
          "rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-lowest p-4 transition-all duration-150 ease-out",
          draggedCategoryId === category.id ? "opacity-55" : undefined
        ].join(" ")}
        style={{ marginLeft: `${depth * 1.25}rem` }}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onDragEnd={() => onDragCategory(null)}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-surface-container-highest p-2 text-secondary-container">
              <GripVertical className="size-4" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-on-surface">{category.name}</p>
                <Badge tone={category.isActive ? "green" : "red"}>
                  {category.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-on-surface/58">/{category.slug}</p>
              {category.description ? (
                <p className="max-w-2xl text-sm leading-6 text-on-surface/68">{category.description}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="outline" onClick={() => onEdit(category)}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => onDelete(category)}>
              <Trash2 className="size-4" />
              Delete
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
  onDelete,
  onDragCategory,
  onDropOnCategory,
  onEdit
}: CategoryTreeProps): JSX.Element {
  return (
    <div
      className="space-y-3 rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropOnCategory(null);
      }}
    >
      <div className="rounded-[calc(var(--radius)-0.125rem)] border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface/62">
        Drop a category anywhere in this canvas to move it to the top level. Drop onto a category card to nest it.
      </div>
      {categories.length > 0 ? (
        categories.map((category) => (
          <CategoryTreeItem
            key={category.id}
            category={category}
            depth={0}
            draggedCategoryId={draggedCategoryId}
            onDelete={onDelete}
            onDragCategory={onDragCategory}
            onDropOnCategory={onDropOnCategory}
            onEdit={onEdit}
          />
        ))
      ) : (
        <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-lowest p-4 text-sm leading-7 text-on-surface/68">
          No categories created yet.
        </div>
      )}
    </div>
  );
}
