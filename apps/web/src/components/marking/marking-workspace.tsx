import type { MarkingColor, MarkingDocument, MarkingPenWidth, MarkingReviewMode } from "@genex/shared";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { MarkingLayer, type MarkingTool } from "@/components/marking/marking-layer";
import { MarkingToolbar } from "@/components/marking/marking-toolbar";
import {
  buildMarkingWorkList,
  findNextUnmarked,
  type MarkingWorkItem
} from "@/components/marking/marking-work-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarkingAnswerView } from "@/lib/api/tests";
import {
  claimAnswer,
  getMarkingQueue,
  releaseAnswerClaim,
  renewAnswerClaim,
  saveScriptPageMarking,
  setAnswerMark,
  submitPaper
} from "@/lib/api/tests";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

interface MarkingWorkspaceProps {
  mode: MarkingReviewMode;
  onModeChange: (mode: MarkingReviewMode) => void;
  testId: string;
}

/** The workspace's own two-card split, drawn while the queue loads. */
function MarkingWorkspaceSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.32fr_0.68fr]">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="h-12 w-full" key={index} />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="aspect-3/4 w-full max-w-2xl" />
        </CardContent>
      </Card>
    </div>
  );
}

/** Renewed well inside the API's two-minute claim, so a working teacher never loses it. */
const claimRenewalMs = 45_000;
const markingSaveDebounceMs = 700;

/**
 * Marking a test's papers, in whichever order the teacher picked.
 *
 * Opening an answer claims it; marks and Marking are written as they are made,
 * and the paper stays unsubmitted until its every answered question has a mark.
 */
export function MarkingWorkspace({
  mode,
  onModeChange,
  testId
}: MarkingWorkspaceProps): JSX.Element {
  const t = useT();
  const [activeAnswer, setActiveAnswer] = useState<MarkingAnswerView | null>(null);
  const [markInput, setMarkInput] = useState("");
  const [markingByPageId, setMarkingByPageId] = useState<Record<string, MarkingDocument>>({});
  const [tool, setTool] = useState<MarkingTool>("PEN");
  const [color, setColor] = useState<MarkingColor>("RED");
  const [penWidth, setPenWidth] = useState<MarkingPenWidth>("MEDIUM");
  const [isBusy, setIsBusy] = useState(false);
  const pendingSaveRef = useRef<Map<string, number>>(new Map());

  const {
    data: queue = null,
    isPending: isQueuePending,
    refetch
  } = useQuery({
    queryFn: async () => getMarkingQueue(testId, mode),
    queryKey: queryKeys.tests.markingQueue(testId, mode)
  });

  const workList = useMemo(() => buildMarkingWorkList(queue, mode), [mode, queue]);
  const activeIndex = workList.findIndex((item) => item.answerId === activeAnswer?.id);
  const activePaper = queue?.papers.find((paper) => paper.submissionId === activeAnswer?.submissionId);

  // The claim expires on its own, so it is renewed for as long as this answer
  // stays open and simply allowed to lapse when the tab goes away.
  useEffect(() => {
    if (!activeAnswer) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void renewAnswerClaim(activeAnswer.id).catch(() => undefined);
    }, claimRenewalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeAnswer]);

  const openAnswer = async (item: MarkingWorkItem): Promise<void> => {
    setIsBusy(true);

    try {
      if (activeAnswer && activeAnswer.id !== item.answerId) {
        await releaseAnswerClaim(activeAnswer.id).catch(() => undefined);
      }

      const answer = await claimAnswer(item.answerId);
      setActiveAnswer(answer);
      setMarkInput(answer.awardedMarks === null ? "" : String(answer.awardedMarks));
      setMarkingByPageId(
        Object.fromEntries(answer.pages.map((page) => [page.id, page.marking]))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("marking.lockedBy", { name: "" }));
    } finally {
      setIsBusy(false);
    }
  };

  const queueMarkingSave = (pageId: string, marking: MarkingDocument): void => {
    setMarkingByPageId((current) => ({ ...current, [pageId]: marking }));

    const pending = pendingSaveRef.current.get(pageId);

    if (pending !== undefined) {
      window.clearTimeout(pending);
    }

    pendingSaveRef.current.set(
      pageId,
      window.setTimeout(() => {
        void saveScriptPageMarking(pageId, marking).catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : t("script.uploadFailed"));
        });
      }, markingSaveDebounceMs)
    );
  };

  const saveMarkAndAdvance = async (): Promise<void> => {
    if (!activeAnswer) {
      return;
    }

    const awardedMarks = Number(markInput);

    if (markInput.trim() === "" || Number.isNaN(awardedMarks)) {
      toast.error(t("marking.saveMark"));
      return;
    }

    setIsBusy(true);

    try {
      await setAnswerMark(activeAnswer.id, { awardedMarks });
      toast.success(t("marking.markSaved"));
      const refreshed = await refetch();
      const nextList = buildMarkingWorkList(refreshed.data ?? null, mode);
      const next = findNextUnmarked(nextList, activeIndex < 0 ? -1 : activeIndex);

      await releaseAnswerClaim(activeAnswer.id).catch(() => undefined);

      if (next) {
        setActiveAnswer(null);
        await openAnswer(next);
        return;
      }

      setActiveAnswer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("marking.saveMark"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitPaper = async (submissionId: string): Promise<void> => {
    setIsBusy(true);

    try {
      await submitPaper(submissionId, { feedback: undefined });
      toast.success(t("marking.paperSubmitted"));
      setActiveAnswer(null);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("marking.incomplete"));
    } finally {
      setIsBusy(false);
    }
  };

  // Without this the first paint says "no papers to mark", which is the one
  // sentence a teacher must not be shown while the queue is still loading.
  if (isQueuePending) {
    return <MarkingWorkspaceSkeleton />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.32fr_0.68fr]">
      <Card>
        <CardHeader>
          <CardTitle>{queue?.testTitle ?? t("marking.title")}</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              type="button"
              variant={mode === "STUDENT" ? "ink" : "outline"}
              onClick={() => onModeChange("STUDENT")}
            >
              {t("marking.byStudent")}
            </Button>
            <Button
              size="sm"
              type="button"
              variant={mode === "QUESTION" ? "ink" : "outline"}
              onClick={() => onModeChange("QUESTION")}
            >
              {t("marking.byQuestion")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {workList.length === 0 ? (
            <p className="text-sm text-ink/62">{t("marking.queueEmpty")}</p>
          ) : (
            workList.map((item) => (
              <button
                key={item.answerId}
                className={`w-full rounded-[calc(var(--radius)-0.125rem)] border px-3 py-2 text-left ${
                  item.answerId === activeAnswer?.id
                    ? "border-accent bg-accent/10"
                    : "border-hairline bg-panel-warm"
                }`}
                disabled={isBusy}
                type="button"
                onClick={() => void openAnswer(item)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">
                    {mode === "QUESTION"
                      ? `Q${item.questionIndex + 1} · ${item.studentName}`
                      : `${item.studentName} · Q${item.questionIndex + 1}`}
                  </span>
                  <span className="shrink-0 text-xs text-ink/62">
                    {item.awardedMarks === null ? "—" : item.awardedMarks} / {item.marks}
                  </span>
                </div>
                {item.lockedByName ? (
                  <span className="text-xs text-error">
                    {t("marking.lockedBy", { name: item.lockedByName })}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        {activeAnswer === null ? (
          <CardContent className="p-6 text-sm text-ink/62">
            {workList.length === 0 ? t("marking.queueEmpty") : t("marking.openPaper")}
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-lg">{activeAnswer.student.name}</CardTitle>
              <CardDescription>
                <RichTextContent
                  className="rich-text-content--inline inline [&_p]:mb-0 [&_p]:inline"
                  html={activeAnswer.questionText}
                  mathDisplay="inline"
                />
              </CardDescription>
              {activePaper ? (
                <p className="text-xs text-ink/62">
                  {t("marking.markedOf", {
                    marked: activePaper.markedCount,
                    total: activePaper.toMarkCount
                  })}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <MarkingToolbar
                canUndo={activeAnswer.pages.some(
                  (page) => (markingByPageId[page.id]?.elements.length ?? 0) > 0
                )}
                color={color}
                penWidth={penWidth}
                tool={tool}
                onColorChange={setColor}
                onPenWidthChange={setPenWidth}
                onToolChange={setTool}
                onUndo={() => {
                  const lastMarked = [...activeAnswer.pages]
                    .reverse()
                    .find((page) => (markingByPageId[page.id]?.elements.length ?? 0) > 0);

                  if (!lastMarked) {
                    return;
                  }

                  const marking = markingByPageId[lastMarked.id];

                  if (!marking) {
                    return;
                  }

                  queueMarkingSave(lastMarked.id, {
                    elements: marking.elements.slice(0, -1),
                    version: marking.version
                  });
                }}
              />

              {activeAnswer.markingGuide ? (
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-3 text-sm text-ink">
                  <span className="font-medium">{t("marking.guide")}: </span>
                  <RichTextContent
                    className="rich-text-content--inline inline text-sm [&_p]:mb-0 [&_p]:inline"
                    html={activeAnswer.markingGuide}
                    mathDisplay="inline"
                  />
                </div>
              ) : null}

              <div className="space-y-3">
                {activeAnswer.pages.map((page) => (
                  <MarkingLayer
                    key={page.id}
                    color={color}
                    marking={markingByPageId[page.id] ?? page.marking}
                    pageHeight={page.height ?? 0}
                    pageUrl={page.fileUrl}
                    pageWidth={page.width ?? 0}
                    penWidth={penWidth}
                    tool={tool}
                    onChange={(next) => queueMarkingSave(page.id, next)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="h-10 w-28"
                  max={activeAnswer.marks}
                  min={0}
                  step={0.5}
                  type="number"
                  value={markInput}
                  onChange={(event) => setMarkInput(event.target.value)}
                />
                <span className="text-sm text-ink/62">
                  {t("marking.outOf", { marks: activeAnswer.marks })}
                </span>
                <Button disabled={isBusy} type="button" onClick={() => void saveMarkAndAdvance()}>
                  {t("marking.saveMark")}
                </Button>
                {activePaper?.isComplete ? (
                  <Button
                    disabled={isBusy}
                    type="button"
                    variant="outline"
                    onClick={() => void handleSubmitPaper(activePaper.submissionId)}
                  >
                    {t("marking.submitPaper")}
                  </Button>
                ) : (
                  <span className="text-xs text-ink/62">{t("marking.incomplete")}</span>
                )}
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
