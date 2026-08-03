import type { JSX } from "react";

import { ResponsiveImage } from "@/components/ui/responsive-image";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export interface AvatarProps {
  className?: string | undefined;
  name: string;
  photo: string | null;
  /**
   * The rendered width, so the browser can pick a variant before layout.
   * Defaults to the smallest, which is right for every avatar in a list.
   */
  sizes?: string | undefined;
}

/**
 * Someone without an uploaded photo gets their initials on the placeholder
 * fill, not a stock portrait of a person who does not work here.
 *
 * The fallback is `placeholder-fill` with muted text rather than a coloured
 * disc — DESIGN.md §9 makes every missing image the same quiet grey.
 */
export function Avatar({ className, name, photo, sizes = "96px" }: AvatarProps): JSX.Element {
  if (photo !== null && photo.length > 0) {
    return (
      <ResponsiveImage
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", className)}
        sizes={sizes}
        src={photo}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-placeholder-fill",
        "label-mono text-sm text-muted-light",
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
