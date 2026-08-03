import type { JSX } from "react";

import { Avatar } from "@/components/ui/avatar";

/**
 * Kept as a named wrapper because the landing sections and the public teacher
 * page both reach for "the teacher's face" rather than for a generic avatar.
 * The drawing itself is `Avatar`.
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
  return <Avatar className={className} name={name} photo={profilePhoto} />;
}
