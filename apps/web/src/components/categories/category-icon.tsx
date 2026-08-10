import * as LucideIcons from "lucide-react";
import type { JSX, ReactNode } from "react";

/**
 * A category's `icon` field is a Lucide component name (picked from
 * `IconPicker`'s library), not an emoji or an image URL — this is the one
 * place that resolves the name to the component, shared by the admin tree
 * and the public category pages so all three agree on what an unknown or
 * empty name renders as: `fallback`, not a silent gap.
 */
const icons = LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>;

export function CategoryIcon({
  className,
  fallback = null,
  icon
}: {
  className?: string;
  fallback?: ReactNode;
  icon: string | null;
}): JSX.Element | ReactNode {
  const IconComp = icon ? icons[icon] : undefined;

  return IconComp ? <IconComp className={className} /> : fallback;
}
