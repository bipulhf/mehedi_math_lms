import { useMemo, useState, type JSX } from "react";

import { formatCourseLength } from "@/components/courses/course-meta";
import { AccordionRow } from "@/components/ui/accordion";
import { RingedPlay } from "@/components/ui/doodles";
import { EmptyState } from "@/components/ui/empty-state";
import type { CourseOutlineChapter, CourseOutlineLesson } from "@/lib/api/content";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * The ক্লাস তালিকা tab: one accordion row per chapter, lessons indented under it.
 *
 * Chapters are independent — opening one never closes another — and the first
 * is open on arrival, per DESIGN.md §6. "Expand all" and "collapse all" are the
 * only things that touch every row at once.
 */
export function CourseCurriculum({
  chapters
}: {
  chapters: readonly CourseOutlineChapter[];
}): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(
    () => new Set(chapters[0] ? [chapters[0].id] : [])
  );

  const lessonCount = useMemo(
    () => chapters.reduce((total, chapter) => total + chapter.lessons.length, 0),
    [chapters]
  );

  if (chapters.length === 0) {
    return <EmptyState message={t("empty.generic")} />;
  }

  const toggle = (id: string): void => {
    setOpenIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-base text-muted">
          {t("detail.curriculumSummary", {
            lessons: format.number(lessonCount),
            modules: format.number(chapters.length)
          })}
        </p>
        <div className="flex gap-4">
          <button
            className="border-b border-line-strong pb-0.5 text-sm text-ink transition-colors duration-150 hover:border-accent hover:text-accent"
            onClick={() => setOpenIds(new Set(chapters.map((chapter) => chapter.id)))}
            type="button"
          >
            {t("detail.expandAll")}
          </button>
          <button
            className="border-b border-line-strong pb-0.5 text-sm text-ink transition-colors duration-150 hover:border-accent hover:text-accent"
            onClick={() => setOpenIds(new Set())}
            type="button"
          >
            {t("detail.collapseAll")}
          </button>
        </div>
      </div>

      <div className="border-t border-hairline">
        {chapters.map((chapter, index) => (
          <AccordionRow
            isOpen={openIds.has(chapter.id)}
            key={chapter.id}
            meta={t("course.lessons", { count: format.number(chapter.lessons.length) })}
            onToggle={() => toggle(chapter.id)}
            title={
              <span className="flex items-baseline gap-3">
                <span className="label-mono text-sm text-muted-faint">
                  {format.digits(String(index + 1).padStart(2, "0"))}
                </span>
                {chapter.title}
              </span>
            }
          >
            <ul className="space-y-1 pl-4 sm:pl-12">
              {chapter.lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} />
              ))}
            </ul>
          </AccordionRow>
        ))}
      </div>
    </div>
  );
}

function LessonRow({ lesson }: { lesson: CourseOutlineLesson }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const length = formatCourseLength(lesson.durationSeconds ?? 0, t, format);

  return (
    <li className="flex items-center gap-3 py-2">
      <RingedPlay />
      <span className="min-w-0 flex-1 truncate text-base font-light text-ink-muted">
        {lesson.title}
      </span>
      {lesson.isPreview ? (
        <span className="rounded-[var(--radius-pill)] border border-hairline px-2.5 py-0.5 text-xs text-accent">
          {t("common.free")}
        </span>
      ) : null}
      {length === null ? null : <span className="text-sm text-muted-light">{length}</span>}
    </li>
  );
}
