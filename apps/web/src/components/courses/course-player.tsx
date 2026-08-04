import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  Megaphone,
  PlayCircle
} from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CourseNoticesPanel } from "@/components/courses/course-notices-panel";
import { LectureDiscussion } from "@/components/courses/lecture-discussion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseDetail } from "@/lib/api/courses";
import type { ContentChapter, ContentLecture, ContentMaterial } from "@/lib/api/content";
import { markLectureComplete, type CourseProgressResponse } from "@/lib/api/progress";
import type { AssessmentChapterSummary, AssessmentTestSummary } from "@/lib/api/tests";
import { useT } from "@/lib/i18n/locale-context";
import { getEmbedVideoUrl } from "@/lib/video";

interface CoursePlayerProps {
  assessments: readonly AssessmentChapterSummary[];
  content: readonly ContentChapter[];
  course: CourseDetail;
  initialProgress: CourseProgressResponse;
}

interface NavigationLectureItem {
  chapterId: string;
  id: string;
  kind: "lecture";
  lecture: ContentLecture;
  title: string;
}

interface NavigationTestItem {
  chapterId: string;
  id: string;
  kind: "test";
  test: AssessmentTestSummary;
  title: string;
}

type NavigationItem = NavigationLectureItem | NavigationTestItem;

function getPdfMaterial(lecture: ContentLecture): ContentMaterial | null {
  return lecture.materials.find((material) => material.fileType === "application/pdf") ?? null;
}

function ChunkedProgressBar({
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

function MaterialLinks({
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

function CourseNavigationItemButton({
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

export function CoursePlayer({
  assessments,
  content,
  course,
  initialProgress
}: CoursePlayerProps): JSX.Element {
  const t = useT();

  const [progress, setProgress] = useState(initialProgress);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [playerMode, setPlayerMode] = useState<"learn" | "notices">("learn");
  const progressByLectureId = useMemo(
    () => new Map(progress.lectures.map((lecture) => [lecture.lectureId, lecture] as const)),
    [progress.lectures]
  );
  const testsByChapterId = useMemo(
    () => new Map(assessments.map((chapter) => [chapter.chapterId, chapter.tests] as const)),
    [assessments]
  );
  const navigationItems = useMemo(() => {
    const items: NavigationItem[] = [];

    for (const chapter of content) {
      const chapterItems: NavigationItem[] = chapter.lectures.map((lecture) => ({
        chapterId: chapter.id,
        id: `lecture:${lecture.id}`,
        kind: "lecture" as const,
        lecture,
        title: lecture.title
      }));

      chapterItems.push(
        ...(testsByChapterId.get(chapter.id) ?? []).map((test) => ({
          chapterId: chapter.id,
          id: `test:${test.id}`,
          kind: "test" as const,
          test,
          title: test.title
        }))
      );
      chapterItems.sort((first, second) => {
        const firstOrder =
          first.kind === "lecture" ? first.lecture.sortOrder : first.test.sortOrder;
        const secondOrder =
          second.kind === "lecture" ? second.lecture.sortOrder : second.test.sortOrder;

        return firstOrder - secondOrder;
      });
      items.push(...chapterItems);
    }

    return items;
  }, [content, testsByChapterId]);
  const allLectures = useMemo(() => content.flatMap((chapter) => chapter.lectures), [content]);
  const selectedItem = useMemo(
    () => navigationItems.find((item) => item.id === selectedItemId) ?? null,
    [navigationItems, selectedItemId]
  );
  const selectedLecture = selectedItem?.kind === "lecture" ? selectedItem.lecture : null;
  const selectedPdf = selectedLecture ? getPdfMaterial(selectedLecture) : null;
  const selectedChapter = useMemo(() => {
    if (!selectedItem) {
      return null;
    }

    return content.find((chapter) => chapter.id === selectedItem.chapterId) ?? null;
  }, [content, selectedItem]);
  const selectedLectureProgress = selectedLecture
    ? (progressByLectureId.get(selectedLecture.id) ?? null)
    : null;
  const selectedIndex = navigationItems.findIndex((item) => item.id === selectedItemId);

  useEffect(() => {
    if (navigationItems.length === 0 || selectedItemId) {
      return;
    }

    const nextLectureId =
      progress.nextLectureId &&
      navigationItems.some((item) => item.id === `lecture:${progress.nextLectureId}`)
        ? `lecture:${progress.nextLectureId}`
        : (navigationItems[0]?.id ?? null);
    setSelectedItemId(nextLectureId);
  }, [navigationItems, progress.nextLectureId, selectedItemId]);

  useEffect(() => {
    if (selectedItem) {
      setOpenChapterId(selectedItem.chapterId);
    }
  }, [selectedItem]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();

      if (event.key === "ArrowLeft" && selectedIndex > 0) {
        setSelectedItemId(navigationItems[selectedIndex - 1]?.id ?? null);
      }

      if (event.key === "ArrowRight" && selectedIndex < navigationItems.length - 1) {
        setSelectedItemId(navigationItems[selectedIndex + 1]?.id ?? null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigationItems, selectedIndex]);

  const handleMarkComplete = async (silent = false): Promise<void> => {
    if (!selectedLecture || selectedLectureProgress?.isCompleted || isMarkingComplete) {
      return;
    }

    setIsMarkingComplete(true);

    try {
      const nextProgress = await markLectureComplete(selectedLecture.id);
      setProgress(nextProgress);

      if (!silent) {
        toast.success(t("player.marked"));
      }
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const embedVideoUrl = selectedLecture?.videoUrl
    ? getEmbedVideoUrl(selectedLecture.videoUrl)
    : null;
  const canUseNativeVideo =
    selectedLecture?.type !== "TEXT" && Boolean(selectedLecture?.videoUrl) && !embedVideoUrl;

  return (
    <div className="space-y-4">
      <div>
        <Card className="overflow-hidden border-hairline/60 bg-panel-warm/80">
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">{course.category.name}</Badge>
                  <Badge tone={progress.enrollmentStatus === "COMPLETED" ? "neutral" : "neutral"}>
                    {progress.enrollmentStatus === "COMPLETED" ? "Course completed" : "In progress"}
                  </Badge>
                </div>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">
                  {course.title}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-ink/66">{course.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                    {t("player.completed")}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-ink">
                    {progress.completedLectures}
                  </p>
                </div>
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                    {t("player.lectures")}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-ink">{progress.totalLectures}</p>
                </div>
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                    {t("mine.progress")}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-ink">
                    {progress.completionPercentage}%
                  </p>
                </div>
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                    {t("player.assessments")}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-ink">
                    {assessments.reduce((sum, chapter) => sum + chapter.tests.length, 0)}
                  </p>
                </div>
              </div>
            </div>
            <ChunkedProgressBar
              currentLectureId={selectedLecture?.id ?? null}
              lectures={allLectures}
              progress={progress}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant={playerMode === "learn" ? "ink" : "outline"}
                onClick={() => setPlayerMode("learn")}
              >
                {t("player.lessonsAndTests")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={playerMode === "notices" ? "ink" : "outline"}
                onClick={() => setPlayerMode("notices")}
              >
                <Megaphone className="size-4" />
                {t("player.notices")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {playerMode === "notices" ? (
        <div>
          <CourseNoticesPanel courseId={course.id} />
        </div>
      ) : null}

      {playerMode === "learn" ? (
        <div className="grid gap-4 xl:grid-cols-[0.34fr_0.66fr]">
          <div>
            <Card className="border-hairline/60 bg-panel-warm/70">
              <CardHeader>
                <CardTitle>{t("player.navigator")}</CardTitle>
                <CardDescription>
                  Browse chapters, jump between lectures, and launch chapter tests with keyboard
                  arrows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {content.map((chapter) => {
                  const chapterNavigationItems = navigationItems.filter(
                    (item) => item.chapterId === chapter.id
                  );
                  const isChapterOpen = openChapterId === chapter.id;

                  return (
                    <div key={chapter.id} className="border border-hairline bg-paper">
                      <button
                        aria-expanded={isChapterOpen}
                        className="flex min-h-14 w-full items-start gap-3 px-4 py-3 text-left"
                        type="button"
                        onClick={() =>
                          setOpenChapterId((current) =>
                            current === chapter.id && selectedItem?.chapterId !== chapter.id
                              ? null
                              : chapter.id
                          )
                        }
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink">{chapter.title}</span>
                          {chapter.description ? (
                            <span className="mt-1 block text-sm leading-6 text-ink/62">
                              {chapter.description}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-xs text-muted">
                          {chapterNavigationItems.length}
                        </span>
                        <span aria-hidden="true" className="w-4 text-center text-xl text-muted">
                          {isChapterOpen ? "−" : "+"}
                        </span>
                      </button>

                      {isChapterOpen ? (
                        <div className="grid gap-2 border-t border-hairline p-3">
                          {chapterNavigationItems.map((item) => (
                            <CourseNavigationItemButton
                              isCompleted={
                                item.kind === "lecture" &&
                                Boolean(progressByLectureId.get(item.lecture.id)?.isCompleted)
                              }
                              isSelected={selectedItemId === item.id}
                              item={item}
                              key={item.id}
                              onSelect={() => setSelectedItemId(item.id)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div>
            {selectedLecture && selectedChapter ? (
              <div className="space-y-4">
                <Card className="overflow-hidden border-hairline/60 bg-panel-warm/70">
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={selectedLectureProgress?.isCompleted ? "neutral" : "neutral"}>
                        {selectedLectureProgress?.isCompleted ? "Completed" : "Active lecture"}
                      </Badge>
                      <Badge tone="quiet">
                        {selectedPdf
                          ? t("author.pdf")
                          : selectedLecture.type === "TEXT"
                            ? t("cb.textLesson")
                            : t("author.video")}
                      </Badge>
                    </div>
                    <CardTitle>{selectedLecture.title}</CardTitle>
                    <CardDescription>
                      {selectedChapter.title}
                      {selectedLecture.videoDuration
                        ? ` · ${selectedLecture.videoDuration} min`
                        : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedLecture.description ? (
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-3 text-sm leading-7 text-ink/72">
                        {selectedLecture.description}
                      </div>
                    ) : null}

                    {selectedPdf ? (
                      <div className="overflow-hidden border border-hairline bg-card">
                        <iframe
                          className="h-[70vh] min-h-96 w-full"
                          src={selectedPdf.fileUrl}
                          title={selectedLecture.title}
                        />
                      </div>
                    ) : selectedLecture.type === "TEXT" ? (
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-5 py-5 text-sm leading-8 text-ink whitespace-pre-wrap">
                        {selectedLecture.content}
                      </div>
                    ) : embedVideoUrl ? (
                      <div className="overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-hairline bg-black">
                        <div className="aspect-video">
                          <iframe
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full"
                            src={embedVideoUrl}
                            title={selectedLecture.title}
                          />
                        </div>
                      </div>
                    ) : canUseNativeVideo && selectedLecture.videoUrl ? (
                      <div className="overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-hairline bg-black">
                        <video
                          className="aspect-video w-full"
                          controls
                          src={selectedLecture.videoUrl}
                          onEnded={() => void handleMarkComplete(true)}
                        />
                      </div>
                    ) : (
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-5 py-5 text-sm leading-7 text-ink/68">
                        This lecture uses an external video source that could not be embedded
                        directly.
                        {selectedLecture.videoUrl ? (
                          <a
                            className="ml-2 font-semibold text-accent underline-offset-4 hover:underline"
                            href={selectedLecture.videoUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {t("player.openVideo")}
                          </a>
                        ) : null}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        disabled={
                          Boolean(selectedLectureProgress?.isCompleted) || isMarkingComplete
                        }
                        onClick={() => void handleMarkComplete()}
                      >
                        {selectedLectureProgress?.isCompleted
                          ? "Completed"
                          : isMarkingComplete
                            ? "Saving progress"
                            : "Mark as complete"}
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/courses/$slug" params={{ slug: course.slug }}>
                          {t("player.overview")}
                        </Link>
                      </Button>
                      {selectedLectureProgress?.lastViewedAt ? (
                        <div className="flex items-center gap-2 text-sm text-ink/58">
                          <Clock3 className="size-4" />
                          <span>
                            Last updated{" "}
                            {new Date(selectedLectureProgress.lastViewedAt).toLocaleString()}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <MaterialLinks
                  materials={selectedLecture.materials}
                  title={t("player.lectureMaterials")}
                />
                <MaterialLinks
                  materials={selectedChapter.materials}
                  title={t("player.chapterMaterials")}
                />
                <LectureDiscussion key={selectedLecture.id} lectureId={selectedLecture.id} />

                <Card>
                  <CardContent className="flex flex-wrap justify-between gap-3 p-4">
                    <Button
                      variant="outline"
                      disabled={selectedIndex <= 0}
                      onClick={() =>
                        setSelectedItemId(navigationItems[selectedIndex - 1]?.id ?? null)
                      }
                    >
                      <ArrowLeft className="size-4" />
                      {t("common.previous")}
                    </Button>
                    <Button
                      disabled={selectedIndex === -1 || selectedIndex >= navigationItems.length - 1}
                      onClick={() =>
                        setSelectedItemId(navigationItems[selectedIndex + 1]?.id ?? null)
                      }
                    >
                      {t("common.next")}
                      <ArrowRight className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : selectedItem?.kind === "test" ? (
              <div className="space-y-4">
                <Card className="border-hairline/60 bg-panel-warm/70">
                  <CardHeader>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="neutral">{t("player.assessment")}</Badge>
                      <Badge tone="quiet">{selectedItem.test.type}</Badge>
                    </div>
                    <CardTitle>{selectedItem.test.title}</CardTitle>
                    <CardDescription>
                      {selectedItem.test.questionCount} questions · {selectedItem.test.totalMarks}{" "}
                      marks
                      {selectedItem.test.durationInMinutes
                        ? ` · ${selectedItem.test.durationInMinutes} min`
                        : " · Untimed"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedItem.test.description ? (
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-3 text-sm leading-7 text-ink/72">
                        <RichTextContent
                          className="text-sm leading-7 text-ink/72"
                          html={selectedItem.test.description}
                        />
                      </div>
                    ) : null}
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                          {t("ab.questions")}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-ink">
                          {selectedItem.test.questionCount}
                        </p>
                      </div>
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                          {t("qe.marks")}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-ink">
                          {selectedItem.test.totalMarks}
                        </p>
                      </div>
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                          {t("player.passing")}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-ink">
                          {selectedItem.test.passingScore ?? "N/A"}
                        </p>
                      </div>
                      {selectedItem.test.maxAttempts !== null ? (
                        <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                            {t("test.attemptsRemainingLabel")}
                          </p>
                          <p className="mt-2 text-xl font-semibold text-ink">
                            {selectedItem.test.attemptsRemaining ?? selectedItem.test.maxAttempts}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    {selectedItem.test.attemptsRemaining === 0 ? (
                      <p className="text-sm text-ink/70">{t("test.attemptsExhausted")}</p>
                    ) : null}
                    <div className="flex gap-3">
                      {selectedItem.test.attemptsRemaining === 0 ? (
                        <Button disabled type="button">
                          <PlayCircle className="size-4" />
                          {t("player.openAssessment")}
                        </Button>
                      ) : (
                        <Button asChild>
                          <Link
                            to="/dashboard/tests/$testId"
                            params={{ testId: selectedItem.test.id }}
                          >
                            <PlayCircle className="size-4" />
                            {t("player.openAssessment")}
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        disabled={selectedIndex <= 0}
                        onClick={() =>
                          setSelectedItemId(navigationItems[selectedIndex - 1]?.id ?? null)
                        }
                      >
                        <ArrowLeft className="size-4" />
                        {t("player.previousItem")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-sm leading-7 text-ink/68">
                  {t("player.noContent")}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CoursePlayerSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <div className="grid grid-cols-4 gap-1 md:grid-cols-8 xl:grid-cols-12">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-2 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[0.34fr_0.66fr]">
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-12 w-44" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
