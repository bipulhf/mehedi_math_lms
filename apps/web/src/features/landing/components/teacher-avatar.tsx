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

/**
 * A teacher without an uploaded photo gets their initials, not a stock
 * portrait of someone who does not work here.
 */
export function TeacherAvatar({
  className,
  name,
  profilePhoto
}: {
  className?: string | undefined;
  name: string;
  profilePhoto: string | null;
}): JSX.Element {
  if (profilePhoto !== null && profilePhoto.length > 0) {
    return (
      <ResponsiveImage
        // An avatar is never wider than a phone's short edge, so the smallest
        // variant is always the right answer here.
        sizes="96px"
        alt={`Portrait of ${name}`}
        className={cn("rounded-full object-cover shrink-0", className)}
        src={profilePhoto}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "rounded-full shrink-0 bg-linear-to-br from-primary to-on-primary-container text-white font-headline font-bold flex items-center justify-center",
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
