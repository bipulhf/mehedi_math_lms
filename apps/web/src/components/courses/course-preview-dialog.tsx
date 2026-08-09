import { useQuery } from "@tanstack/react-query";
import { Download, X } from "lucide-react";
import type { JSX } from "react";
import { useEffect } from "react";

import { formatCourseLength } from "@/components/courses/course-meta";
import { LecturePlayer } from "@/components/media/lecture-player";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseLecturePreview, ContentMaterial } from "@/lib/api/content";
import { getLecturePreview } from "@/lib/api/content";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

export interface CoursePreviewDialogProps {
  /** The free lesson to play; `null` keeps the dialog closed. */
  lessonId: string | null;
  onClose: () => void;
}

function getPdfMaterial(materials: readonly ContentMaterial[]): ContentMaterial | null {
  return materials.find((material) => material.fileType === "application/pdf") ?? null;
}

function LectureBody({ lecture }: { lecture: CourseLecturePreview }): JSX.Element {
  const t = useT();
  const pdf = getPdfMaterial(lecture.materials);

  if (pdf) {
    return (
      <iframe
        className="h-[28rem] w-full border border-hairline bg-panel-warm sm:h-[36rem]"
        src={pdf.fileUrl}
        title={lecture.title}
      />
    );
  }

  if (lecture.type === "TEXT") {
    return (
      <div className="whitespace-pre-wrap border border-hairline bg-panel-warm px-5 py-5 text-base font-light leading-relaxed text-ink">
        {lecture.content}
      </div>
    );
  }

  if (lecture.videoUrl) {
    return <LecturePlayer chapters={lecture.chapters} src={lecture.videoUrl} title={lecture.title} />;
  }

  return <EmptyState message={t("detail.previewUnavailable")} />;
}

/**
 * Plays a free class over the course page. Only lessons the outline marks
 * `isPreview` reach it — the body arrives from a public endpoint that refuses
 * anything else, so an open dialog can never show a paid lesson.
 *
 * The preview is an ink plate over a black scrim, with a mobile-first scrollable
 * body.
 */
export function CoursePreviewDialog({ lessonId, onClose }: CoursePreviewDialogProps): JSX.Element | null {
  const t = useT();
  const format = useFormat();

  const { data: lecture, isError, isPending } = useQuery({
    enabled: lessonId !== null,
    queryFn: async () => getLecturePreview(lessonId!),
    queryKey: queryKeys.content.lecturePreview(lessonId ?? "")
  });

  useEffect(() => {
    if (lessonId === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lessonId, onClose]);

  if (lessonId === null) {
    return null;
  }

  const length = lecture ? formatCourseLength(lecture.durationSeconds ?? 0, t, format) : null;

  return (
    <div
       className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        aria-labelledby="course-preview-title"
        aria-modal="true"
         className="w-full max-w-3xl rounded-[var(--radius-md)] border border-hairline bg-background p-5 sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-4">
          <div className="min-w-0">
            <p className="label-mono text-xs uppercase text-muted-faint">{t("common.free")}</p>
            <h3 className="mt-2 break-words text-xl font-medium text-ink" id="course-preview-title">
              {lecture?.title ?? t("common.loading")}
            </h3>
            {length === null ? null : (
              <p className="mt-1 text-sm text-muted-light">{length}</p>
            )}
          </div>
          <button
            aria-label={t("common.close")}
            className="shrink-0 border border-hairline p-2 text-ink transition-colors hover:border-accent hover:text-accent"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 pt-5">
          {isPending ? <Skeleton className="aspect-video w-full" /> : null}

          {isError || (!isPending && !lecture) ? (
            <EmptyState message={t("detail.previewUnavailable")} />
          ) : null}

          {lecture ? (
            <>
              {lecture.description ? (
                <p className="text-base font-light leading-relaxed text-muted">
                  {lecture.description}
                </p>
              ) : null}

              <LectureBody lecture={lecture} />

              {lecture.materials.length > 0 ? (
                <ul className="border-t border-hairline">
                  {lecture.materials.map((material) => (
                    <li className="border-b border-hairline-faint" key={material.id}>
                      <a
                        className="flex items-center justify-between gap-3 py-3 text-base text-ink transition-colors hover:text-accent"
                        href={material.fileUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="min-w-0 truncate font-light">{material.title}</span>
                        <Download className="size-4 shrink-0 text-muted-light" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
