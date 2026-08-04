import { BookOpen, CheckCircle2, Circle, Download } from "lucide-react";
import type { JSX } from "react";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentLecture, ContentMaterial } from "@/lib/api/content";
import type { CourseProgressResponse } from "@/lib/api/progress";
import type { AssessmentTestSummary } from "@/lib/api/tests";
import { useT } from "@/lib/i18n/locale-context";

export interface NavigationLectureItem {
  chapterId: string;
  id: string;
  kind: "lecture";
  lecture: ContentLecture;
  title: string;
}

export interface NavigationTestItem {
  chapterId: string;
  id: string;
  kind: "test";
  test: AssessmentTestSummary;
  title: string;
}

export type NavigationItem = NavigationLectureItem | NavigationTestItem;

export function getPdfMaterial(lecture: ContentLecture): ContentMaterial | null {
  return lecture.materials.find((material) => material.fileType === "application/pdf") ?? null;
}

export function ChunkedProgressBar({
  currentLectureId,
  progress,
  lectures
}: {
  currentLectureId: string | null;
  progress: CourseProgressResponse;
  lectures: readonly ContentLecture[];
}): JSX.Element {
  const progressByLectureId = useMemo(
    () => new Map(progress.lectures.map((lecture) => [lecture.lectureId, lecture] as const)),
    [progress.lectures]
  );

  return (
    <div className="grid grid-cols-4 gap-1 md:grid-cols-8 xl:grid-cols-12">
      {lectures.map((lecture) => {
        const lectureProgress = progressByLectureId.get(lecture.id);
        const isCurrent = lecture.id === currentLectureId;

        return (
          <div
            key={lecture.id}
            className={`h-2 rounded-full transition-all duration-150 ease-out ${
              lectureProgress?.isCompleted
                ? "bg-accent"
                : isCurrent
                  ? "bg-ink/45"
                  : "bg-chip-active"
            }`}
          />
        );
      })}
    </div>
  );
}

export function MaterialLinks({
  materials,
  title
}: {
  materials: readonly ContentMaterial[];
  title: string;
}): JSX.Element | null {
  if (materials.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {materials.map((material) => (
          <a
            key={material.id}
            className="flex min-h-11 items-center justify-between gap-3 rounded-[calc(var(--radius)-0.125rem)] border border-hairline bg-panel-warm px-4 py-3 transition-all ease-out hover:bg-panel-warm"
            href={material.fileUrl}
            rel="noreferrer"
            target="_blank"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{material.title}</p>
              <p className="text-xs text-ink/60">{material.fileType}</p>
            </div>
            <Download className="size-4 shrink-0 text-ink/60" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

export function CourseNavigationItemButton({
  isCompleted,
  isSelected,
  item,
  onSelect
}: {
  isCompleted: boolean;
  isSelected: boolean;
  item: NavigationItem;
  onSelect: () => void;
}): JSX.Element {
  const t = useT();

  return (
    <button
      className={`flex min-h-11 items-center justify-between gap-3 rounded-[calc(var(--radius)-0.125rem)] border px-3 py-3 text-left transition-all duration-150 ease-out ${
        isSelected
          ? "border-accent bg-accent/10"
          : "border-hairline bg-panel-warm hover:bg-panel-warm"
      }`}
      type="button"
      onClick={onSelect}
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{item.title}</p>
        <p className="text-xs text-ink/58">
          {item.kind === "lecture" ? (
            <>
              {getPdfMaterial(item.lecture)
                ? t("author.pdf")
                : item.lecture.type === "TEXT"
                  ? t("cb.textLesson")
                  : t("author.video")}{" "}
              · {item.lecture.videoDuration ? `${item.lecture.videoDuration} min` : "Self-paced"}
            </>
          ) : (
            <>
              Assessment · {item.test.questionCount} questions · {item.test.totalMarks} marks
            </>
          )}
        </p>
      </div>
      {item.kind === "test" ? (
        <BookOpen className="size-4 shrink-0 text-ink/52" />
      ) : isCompleted ? (
        <CheckCircle2 className="size-4 shrink-0 text-accent" />
      ) : (
        <Circle className="size-4 shrink-0 text-ink/42" />
      )}
    </button>
  );
}
