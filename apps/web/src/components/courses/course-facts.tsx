import type { JSX } from "react";

import type { CourseDetail } from "@/lib/api/courses";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { hueForIndex, spectrumClasses } from "@/lib/spectrum";

/**
 * The numbers a buyer asks for, on one line under the hero.
 *
 * Every one is read off `course.stats` — there is no "6 months", no seat count
 * and no batch date, because no column holds them (GENEX_MIGRATION.md §2). A
 * figure with nothing behind it is dropped rather than printed as zero.
 */
export function CourseFacts({
  course,
  reviewSummary
}: {
  course: CourseDetail;
  reviewSummary: { average: number; count: number } | null;
}): JSX.Element | null {
  const t = useT();
  const format = useFormat();
  const facts: readonly { label: string; value: string }[] = [
    ...(course.stats.enrolledStudentCount > 0
      ? [
          {
            label: t("common.students"),
            value: format.number(course.stats.enrolledStudentCount)
          }
        ]
      : []),
    ...(course.stats.lectureCount > 0
      ? [{ label: t("common.lessons"), value: format.number(course.stats.lectureCount) }]
      : []),
    ...(course.stats.freeLessonCount > 0
      ? [{ label: t("detail.factFree"), value: format.number(course.stats.freeLessonCount) }]
      : []),
    ...(reviewSummary && reviewSummary.count > 0
      ? [{ label: t("common.rating"), value: format.rating(reviewSummary.average) }]
      : [])
  ];

  if (facts.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-hairline">
      <dl className="mx-auto grid w-full max-w-[90rem] grid-cols-2 gap-4 px-4 py-6 sm:px-8 lg:grid-cols-3 lg:px-14">
        {facts.map((fact, index) => (
          <div className={`border-l-2 pl-4 ${spectrumClasses(hueForIndex(index)).rule}`} key={fact.label}>
            <dd className="text-xl font-medium text-ink sm:text-2xl">{fact.value}</dd>
            <dt className="mt-0.5 text-sm text-muted-light">{fact.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
