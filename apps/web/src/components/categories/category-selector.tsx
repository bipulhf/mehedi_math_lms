import type { JSX } from "react";

import type { CategoryNode } from "@/lib/api/categories";
import { Select } from "@/components/ui/select";

interface CategorySelectorProps {
  categories: readonly CategoryNode[];
  error?: string | undefined;
  id?: string | undefined;
  includeRootOption?: boolean;
  onChange: (value: string) => void;
  value: string;
}

function flattenCategories(
  categories: readonly CategoryNode[],
  depth = 0
): ReadonlyArray<{ id: string; label: string }> {
  return categories.flatMap((category) => [
    {
      id: category.id,
      label: `${"  ".repeat(depth)}${category.name}`
    },
    ...flattenCategories(category.children, depth + 1)
  ]);
}

export function CategorySelector({
  categories,
  error,
  id,
  includeRootOption = true,
  onChange,
  value
}: CategorySelectorProps): JSX.Element {
  const options = flattenCategories(categories);

  return (
    <Select id={id} value={value} error={error} onChange={(event) => onChange(event.target.value)}>
      {includeRootOption ? (
        <option value="">No parent</option>
      ) : (
        <option value="" disabled>
          Select a category
        </option>
      )}
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
