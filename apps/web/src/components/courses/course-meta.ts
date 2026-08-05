import type { Formatters, Translator } from "@genex/i18n";

import type { CourseStats } from "@/lib/api/courses";

/**
 * The design writes a course's length as "৬ মাস". No column holds that, so the
 * honest substitute is the summed lesson duration — see GENEX_MIGRATION.md §2.
 *
 * Rounds to whole hours above one hour and whole minutes below it. A catalogue
 * card saying "৫ ঘণ্টা ৪৩ মিনিট" is precision nobody asked for.
 */
export function formatCourseLength(
  totalDurationSeconds: number,
  t: Translator,
  format: Formatters
): string | null {
  if (totalDurationSeconds <= 0) {
    return null;
  }

  const minutes = Math.round(totalDurationSeconds / 60);

  if (minutes < 60) {
    return t("course.minutes", { count: format.number(minutes) });
  }

  return t("course.hours", { count: format.number(Math.round(minutes / 60)) });
}

/**
 * The meta line under a card title: lessons · free lessons.
 *
 * The summed course length used to open this line. It is gone at the owner's
 * request — `formatCourseLength` stays because a single lesson's length is
 * still shown, on the class list and in the preview dialog.
 */
export function courseMetaParts(
  stats: CourseStats,
  t: Translator,
  format: Formatters
): readonly string[] {
  const parts: string[] = [];

  if (stats.lectureCount > 0) {
    parts.push(t("course.lessons", { count: format.number(stats.lectureCount) }));
  }

  if (stats.freeLessonCount > 0) {
    parts.push(t("course.freeLessons", { count: format.number(stats.freeLessonCount) }));
  }

  return parts;
}
