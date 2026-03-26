import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  FileText,
  Megaphone,
  PlayCircle
} from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FadeIn } from "@/components/common/fade-in";
import { CourseNoticesPanel } from "@/components/courses/course-notices-panel";
import { LectureDiscussion } from "@/components/courses/lecture-discussion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseDetail } from "@/lib/api/courses";
import type { ContentChapter, ContentLecture, ContentMaterial } from "@/lib/api/content";
import { markLectureComplete, type CourseProgressResponse } from "@/lib/api/progress";
import type { AssessmentChapterSummary, AssessmentTestSummary } from "@/lib/api/tests";

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

function getEmbedVideoUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const videoId = url.searchParams.get("v");

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "youtu.be") {
      const videoId = url.pathname.replace("/", "");

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "vimeo.com") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];

      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    if (hostname === "player.vimeo.com") {
      return value;
    }

    return null;
  } catch {
    return null;
  }
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
                ? "bg-secondary-container"
                : isCurrent
                  ? "bg-primary/45"
                  : "bg-surface-container-highest"
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
            className="flex min-h-11 items-center justify-between gap-3 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low px-4 py-3 transition-all duration-150 ease-out hover:bg-surface-container"
            href={material.fileUrl}
            rel="noreferrer"
            target="_blank"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-on-surface">{material.title}</p>
              <p className="text-xs text-on-surface/60">{material.fileType}</p>
            </div>
            <Download className="size-4 shrink-0 text-on-surface/60" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

export function CoursePlayer({
  assessments,
  content,
  course,
  initialProgress
}: CoursePlayerProps): JSX.Element {
  const [progress, setProgress] = useState(initialProgress);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
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
      for (const lecture of chapter.lectures) {
        items.push({
          chapterId: chapter.id,
          id: `lecture:${lecture.id}`,
          kind: "lecture",
          lecture,
          title: lecture.title
        });
      }

      for (const test of testsByChapterId.get(chapter.id) ?? []) {
        items.push({
          chapterId: chapter.id,
          id: `test:${test.id}`,
          kind: "test",
          test,
          title: test.title
        });
      }
    }

    return items;
  }, [content, testsByChapterId]);
  const allLectures = useMemo(() => content.flatMap((chapter) => chapter.lectures), [content]);
  const selectedItem = useMemo(
    () => navigationItems.find((item) => item.id === selectedItemId) ?? null,
    [navigationItems, selectedItemId]
  );
  const selectedLecture = selectedItem?.kind === "lecture" ? selectedItem.lecture : null;
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
        toast.success("Lecture marked as complete");
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
      <FadeIn>
        <Card className="overflow-hidden border-outline-variant/60 bg-surface-container-low/80 backdrop-blur-xl">
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{course.category.name}</Badge>
                  <Badge tone={progress.enrollmentStatus === "COMPLETED" ? "green" : "violet"}>
                    {progress.enrollmentStatus === "COMPLETED" ? "Course completed" : "In progress"}
                  </Badge>
                </div>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-on-surface md:text-4xl">
                  {course.title}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-on-surface/66">
                  {course.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-on-surface/52">
                    Completed
                  </p>
                  <p className="mt-2 text-xl font-semibold text-on-surface">
                    {progress.completedLectures}
                  </p>
                </div>
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-on-surface/52">Lectures</p>
                  <p className="mt-2 text-xl font-semibold text-on-surface">
                    {progress.totalLectures}
                  </p>
                </div>
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-on-surface/52">Progress</p>
                  <p className="mt-2 text-xl font-semibold text-on-surface">
                    {progress.completionPercentage}%
                  </p>
                </div>
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-on-surface/52">
                    Assessments
                  </p>
                  <p className="mt-2 text-xl font-semibold text-on-surface">
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
                variant={playerMode === "learn" ? "default" : "outline"}
                onClick={() => setPlayerMode("learn")}
              >
                Lessons & tests
              </Button>
              <Button
                type="button"
                size="sm"
                variant={playerMode === "notices" ? "default" : "outline"}
                onClick={() => setPlayerMode("notices")}
              >
                <Megaphone className="size-4" />
                Course notices
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {playerMode === "notices" ? (
        <FadeIn>
          <CourseNoticesPanel courseId={course.id} />
        </FadeIn>
      ) : null}

      {playerMode === "learn" ? (
        <div className="grid gap-4 xl:grid-cols-[0.34fr_0.66fr]">
          <FadeIn>
            <Card className="border-outline-variant/60 bg-surface-container-low/70 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Course navigator</CardTitle>
                <CardDescription>
                  Browse chapters, jump between lectures, and launch chapter tests with keyboard
                  arrows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {content.map((chapter) => (
                  <div key={chapter.id} className="space-y-3">
                    <div className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant/70 bg-surface px-4 py-3">
                      <p className="font-semibold text-on-surface">{chapter.title}</p>
                      {chapter.description ? (
                        <p className="mt-1 text-sm leading-6 text-on-surface/62">
                          {chapter.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      {chapter.lectures.map((lecture) => {
                        const lectureProgress = progressByLectureId.get(lecture.id);
                        const isSelected = selectedItemId === `lecture:${lecture.id}`;

                        return (
                          <button
                            key={lecture.id}
                            className={`flex min-h-11 items-center justify-between gap-3 rounded-[calc(var(--radius)-0.125rem)] border px-3 py-3 text-left transition-all duration-150 ease-out ${
                              isSelected
                                ? "border-secondary-container bg-secondary-container/10"
                                : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
                            }`}
                            type="button"
                            onClick={() => setSelectedItemId(`lecture:${lecture.id}`)}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-on-surface">
                                {lecture.title}
                              </p>
                              <p className="text-xs text-on-surface/58">
                                {lecture.type === "TEXT" ? "Reading" : "Video"} ·{" "}
                                {lecture.videoDuration
                                  ? `${lecture.videoDuration} min`
                                  : "Self-paced"}
                              </p>
                            </div>
                            {lectureProgress?.isCompleted ? (
                              <CheckCircle2 className="size-4 shrink-0 text-secondary-container" />
                            ) : (
                              <Circle className="size-4 shrink-0 text-on-surface/42" />
                            )}
                          </button>
                        );
                      })}

                      {(testsByChapterId.get(chapter.id) ?? []).map((test) => {
                        const isSelected = selectedItemId === `test:${test.id}`;

                        return (
                          <button
                            key={test.id}
                            className={`flex min-h-11 items-center justify-between gap-3 rounded-[calc(var(--radius)-0.125rem)] border px-3 py-3 text-left transition-all duration-150 ease-out ${
                              isSelected
                                ? "border-secondary-container bg-secondary-container/10"
                                : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
                            }`}
                            type="button"
                            onClick={() => setSelectedItemId(`test:${test.id}`)}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-on-surface">{test.title}</p>
                              <p className="text-xs text-on-surface/58">
                                Assessment · {test.questionCount} questions · {test.totalMarks}{" "}
                                marks
                              </p>
                            </div>
                            <BookOpen className="size-4 shrink-0 text-on-surface/52" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delayClassName="animation-delay-100">
            {selectedLecture && selectedChapter ? (
              <div className="space-y-4">
                <Card className="overflow-hidden border-outline-variant/60 bg-surface-container-low/70 backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={selectedLectureProgress?.isCompleted ? "green" : "blue"}>
                        {selectedLectureProgress?.isCompleted ? "Completed" : "Active lecture"}
                      </Badge>
                      <Badge tone="gray">
                        {selectedLecture.type === "TEXT" ? "Reading" : "Video"}
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
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-4 py-3 text-sm leading-7 text-on-surface/72">
                        {selectedLecture.description}
                      </div>
                    ) : null}

                    {selectedLecture.type === "TEXT" ? (
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-5 py-5 text-sm leading-8 text-on-surface whitespace-pre-wrap">
                        {selectedLecture.content}
                      </div>
                    ) : embedVideoUrl ? (
                      <div className="overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-black">
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
                      <div className="overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-black">
                        <video
                          className="aspect-video w-full"
                          controls
                          src={selectedLecture.videoUrl}
                          onEnded={() => void handleMarkComplete(true)}
                        />
                      </div>
                    ) : (
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-5 py-5 text-sm leading-7 text-on-surface/68">
                        This lecture uses an external video source that could not be embedded
                        directly.
                        {selectedLecture.videoUrl ? (
                          <a
                            className="ml-2 font-semibold text-secondary-container underline-offset-4 hover:underline"
                            href={selectedLecture.videoUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open video
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
                          Course overview
                        </Link>
                      </Button>
                      {selectedLectureProgress?.lastViewedAt ? (
                        <div className="flex items-center gap-2 text-sm text-on-surface/58">
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

                <MaterialLinks materials={selectedLecture.materials} title="Lecture materials" />
                <MaterialLinks materials={selectedChapter.materials} title="Chapter materials" />
                <LectureDiscussion lectureId={selectedLecture.id} />

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
                      Previous
                    </Button>
                    <Button
                      disabled={selectedIndex === -1 || selectedIndex >= navigationItems.length - 1}
                      onClick={() =>
                        setSelectedItemId(navigationItems[selectedIndex + 1]?.id ?? null)
                      }
                    >
                      Next
                      <ArrowRight className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : selectedItem?.kind === "test" ? (
              <div className="space-y-4">
                <Card className="border-outline-variant/60 bg-surface-container-low/70 backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="violet">Assessment</Badge>
                      <Badge tone="gray">{selectedItem.test.type}</Badge>
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
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-4 py-3 text-sm leading-7 text-on-surface/72">
                        {selectedItem.test.description}
                      </div>
                    ) : null}
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-on-surface/52">
                          Questions
                        </p>
                        <p className="mt-2 text-xl font-semibold text-on-surface">
                          {selectedItem.test.questionCount}
                        </p>
                      </div>
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-on-surface/52">
                          Marks
                        </p>
                        <p className="mt-2 text-xl font-semibold text-on-surface">
                          {selectedItem.test.totalMarks}
                        </p>
                      </div>
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-on-surface/52">
                          Passing
                        </p>
                        <p className="mt-2 text-xl font-semibold text-on-surface">
                          {selectedItem.test.passingScore ?? "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button asChild>
                        <Link
                          to="/dashboard/tests/$testId"
                          params={{ testId: selectedItem.test.id }}
                        >
                          <PlayCircle className="size-4" />
                          Open assessment
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        disabled={selectedIndex <= 0}
                        onClick={() =>
                          setSelectedItemId(navigationItems[selectedIndex - 1]?.id ?? null)
                        }
                      >
                        <ArrowLeft className="size-4" />
                        Previous item
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-sm leading-7 text-on-surface/68">
                  No course content is available yet.
                </CardContent>
              </Card>
            )}
          </FadeIn>
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
