import type { JSX } from "react";

import type { CategoryNode } from "@/lib/api/categories";
import { Select } from "@/components/ui/select";
import { useT } from "@/lib/i18n/locale-context";

interface CategorySelectorProps {
  categories: readonly CategoryNode[];
  error?: string | undefined;
  id?: string | undefined;
  includeRootOption?: boolean;
  onChange: (value: string) => void;
  value: string;
}

/**
 * Depth is shown with non-breaking spaces: the list is real markup now, and
 * HTML would collapse a plain-space indent to nothing.
 */
function flattenCategories(
  categories: readonly CategoryNode[],
  depth = 0
): ReadonlyArray<{ id: string; label: string }> {
  return categories.flatMap((category) => [
    {
      id: category.id,
      label: `${"\u00a0\u00a0".repeat(depth)}${category.name}`
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
  const t = useT();

  const options = flattenCategories(categories);

  return (
    <Select
      error={error}
      id={id}
      onValueChange={onChange}
      options={[
        includeRootOption
          ? { label: t("cat.noParent"), value: "" }
          : { disabled: true, label: t("cat.select"), value: "" },
        ...options.map((option) => ({ label: option.label, value: option.id }))
      ]}
      value={value}
    />
  );
}
