import type {
  MarkingColor,
  MarkingDocument,
  MarkingPenWidth,
  MarkingReviewMode
} from "@mma/shared";
import { markingDocumentVersion } from "@mma/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";

import { HtmlContent } from "@/src/components/html-content";
import { MarkingLayer, type MarkingTool } from "@/src/components/marking-layer";
import { Body, Button, Caption, Card, Screen, SkeletonBlock, Title } from "@/src/components/ui";
import type { MarkingAnswerView } from "@/src/lib/api";
import {
  claimAnswer,
  getMarkingQueue,
  releaseAnswerClaim,
  renewAnswerClaim,
  saveScriptPageMarking,
  setAnswerMark,
  submitPaper
} from "@/src/lib/api";
import { useT } from "@/src/lib/locale";
import {
  buildMarkingWorkList,
  findNextUnmarked,
  type MarkingWorkItem
} from "@/src/lib/marking-work-list";
import { queryKeys } from "@/src/lib/query";
import { colors, radius, spacing } from "@/src/theme/tokens";

/** Renewed well inside the API's two-minute claim, so a working teacher never loses it. */
const claimRenewalMs = 45_000;
const markingSaveDebounceMs = 700;

const tools: readonly { label: string; value: MarkingTool }[] = [
  { label: "✎", value: "PEN" },
  { label: "✓", value: "TICK" },
  { label: "✗", value: "CROSS" },
  { label: "½", value: "HALF" },
  { label: "T", value: "NOTE" },
  { label: "⌫", value: "ERASER" }
];

const markingColors: readonly MarkingColor[] = ["RED", "GREEN", "BLUE", "BLACK"];

/**
 * Marking a test's papers on a phone.
 *
 * Same rules as the web workspace: opening an answer claims it, marks and
 * Marking are written as they are made, and the paper stays unsubmitted until
 * every answered question has a mark.
 */
export default function MarkingScreen(): JSX.Element {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const t = useT();
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.max(160, windowWidth - 96);
  const [mode, setMode] = useState<MarkingReviewMode>("STUDENT");
  const [activeAnswer, setActiveAnswer] = useState<MarkingAnswerView | null>(null);
  const [markInput, setMarkInput] = useState("");
  const [markingByPageId, setMarkingByPageId] = useState<Record<string, MarkingDocument>>({});
  const [tool, setTool] = useState<MarkingTool>("PEN");
  const [color, setColor] = useState<MarkingColor>("RED");
  const [penWidth] = useState<MarkingPenWidth>("MEDIUM");
  const [pendingNote, setPendingNote] = useState<{ pageId: string; x: number; y: number } | null>(
    null
  );
  const [noteText, setNoteText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { data: queue, isPending, refetch } = useQuery({
    queryFn: async () => getMarkingQueue(testId, mode),
    queryKey: queryKeys.markingQueue(testId, mode)
  });

  const workList = useMemo(() => buildMarkingWorkList(queue, mode), [mode, queue]);
  const activeIndex = workList.findIndex((item) => item.answerId === activeAnswer?.id);
  const activePaper = queue?.papers.find(
    (paper) => paper.submissionId === activeAnswer?.submissionId
  );
  /** Whether this mark is the paper's last one, and so hands the paper in. */
  const isLastAnswerOfPaper =
    activePaper !== undefined &&
    activePaper.status === "SUBMITTED" &&
    activePaper.questions.every(
      (question) =>
        question.answerId === null ||
        question.pageCount === 0 ||
        question.awardedMarks !== null ||
        question.answerId === activeAnswer?.id
    );

  useEffect(() => {
    if (!activeAnswer) {
      return;
    }

    const interval = setInterval(() => {
      void renewAnswerClaim(activeAnswer.id).catch(() => undefined);
    }, claimRenewalMs);

    return () => {
      clearInterval(interval);
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
      setMarkingByPageId(Object.fromEntries(answer.pages.map((page) => [page.id, page.marking])));
    } catch (error) {
      Alert.alert(
        t("marking.title"),
        error instanceof Error ? error.message : t("marking.lockedBy", { name: "" })
      );
    } finally {
      setIsBusy(false);
    }
  };

  const queueMarkingSave = (pageId: string, marking: MarkingDocument): void => {
    setMarkingByPageId((current) => ({ ...current, [pageId]: marking }));

    const pending = saveTimersRef.current.get(pageId);

    if (pending) {
      clearTimeout(pending);
    }

    saveTimersRef.current.set(
      pageId,
      setTimeout(() => {
        void saveScriptPageMarking(pageId, marking).catch(() => undefined);
      }, markingSaveDebounceMs)
    );
  };

  /**
   * Marking the last answer of a paper hands the paper in, as on the web: the
   * mark is the decision and handing in is its consequence, so there is one
   * button rather than a second that can only be pressed at one moment.
   */
  const saveMarkAndAdvance = async (): Promise<void> => {
    if (!activeAnswer) {
      return;
    }

    const awardedMarks = Number(markInput);

    if (markInput.trim() === "" || Number.isNaN(awardedMarks)) {
      Alert.alert(t("marking.saveMark"), t("marking.markNeeded"));
      return;
    }

    setIsBusy(true);

    try {
      await setAnswerMark(activeAnswer.id, { awardedMarks });
      await releaseAnswerClaim(activeAnswer.id).catch(() => undefined);

      const refreshed = await refetch();
      const paper =
        refreshed.data?.papers.find(
          (candidate) => candidate.submissionId === activeAnswer.submissionId
        ) ?? null;
      let workListNow = buildMarkingWorkList(refreshed.data, mode);
      let fromIndex = activeIndex < 0 ? -1 : activeIndex;

      // `isComplete` is the server's count -- the same one that decides whether
      // the submit would be refused.
      if (paper?.status === "SUBMITTED" && paper.isComplete) {
        await submitPaper(paper.submissionId, { feedback: undefined });
        Alert.alert(t("marking.title"), t("marking.paperSubmitted"));

        // The paper left the queue, so every index after it moved.
        const afterSubmit = await refetch();

        workListNow = buildMarkingWorkList(afterSubmit.data, mode);
        fromIndex = -1;
      }

      const next = findNextUnmarked(workListNow, fromIndex);

      setActiveAnswer(null);

      if (next) {
        await openAnswer(next);
      }
    } catch (error) {
      Alert.alert(
        t("marking.saveMark"),
        error instanceof Error ? error.message : t("marking.saveMark")
      );
    } finally {
      setIsBusy(false);
    }
  };

  const addNote = (): void => {
    if (!pendingNote || noteText.trim().length === 0) {
      setPendingNote(null);
      setNoteText("");
      return;
    }

    const current = markingByPageId[pendingNote.pageId] ?? {
      elements: [],
      version: markingDocumentVersion
    };

    queueMarkingSave(pendingNote.pageId, {
      elements: [
        ...current.elements,
        {
          color,
          fontSize: 0.025,
          id: `note-${Math.random().toString(36).slice(2, 10)}`,
          kind: "NOTE",
          text: noteText.trim().slice(0, 500),
          x: pendingNote.x,
          y: pendingNote.y
        }
      ],
      version: markingDocumentVersion
    });
    setPendingNote(null);
    setNoteText("");
  };

  if (isPending) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={26} width="60%" />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={220} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: queue?.testTitle ?? t("marking.title") }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: spacing.sm }}>
          <Title>{queue?.testTitle ?? t("marking.title")}</Title>
          <View style={styles.row}>
            <Button
              label={t("marking.byStudent")}
              onPress={() => setMode("STUDENT")}
              size="sm"
              variant={mode === "STUDENT" ? "ink" : "outline"}
            />
            <Button
              label={t("marking.byQuestion")}
              onPress={() => setMode("QUESTION")}
              size="sm"
              variant={mode === "QUESTION" ? "ink" : "outline"}
            />
          </View>
          {workList.length === 0 ? (
            <Body muted>{t("marking.queueEmpty")}</Body>
          ) : (
            workList.map((item) => (
              <Pressable
                key={item.answerId}
                disabled={isBusy}
                onPress={() => void openAnswer(item)}
                style={[
                  styles.queueRow,
                  item.answerId === activeAnswer?.id ? styles.queueRowActive : null
                ]}
              >
                <Caption>
                  {mode === "QUESTION"
                    ? `Q${item.questionIndex + 1} · ${item.studentName}`
                    : `${item.studentName} · Q${item.questionIndex + 1}`}
                </Caption>
                <Caption tone="faint">
                  {item.awardedMarks === null ? "—" : item.awardedMarks} / {item.marks}
                </Caption>
              </Pressable>
            ))
          )}
        </Card>

        {activeAnswer ? (
          <Card style={{ gap: spacing.sm }}>
            <Title>{activeAnswer.student.name}</Title>
            <HtmlContent html={activeAnswer.questionText} />
            {activePaper ? (
              <Caption tone="faint">
                {t("marking.markedOf", {
                  marked: activePaper.markedCount,
                  total: activePaper.toMarkCount
                })}
              </Caption>
            ) : null}

            <View style={styles.row}>
              {tools.map((item) => (
                <Button
                  key={item.value}
                  label={item.label}
                  onPress={() => setTool(item.value)}
                  size="xs"
                  variant={tool === item.value ? "ink" : "outline"}
                />
              ))}
            </View>
            <View style={styles.row}>
              {markingColors.map((item) => (
                <Button
                  key={item}
                  label={item.toLowerCase()}
                  onPress={() => setColor(item)}
                  size="xs"
                  variant={color === item ? "ink" : "outline"}
                />
              ))}
            </View>

            {activeAnswer.markingGuide ? (
              <View style={styles.guide}>
                <Caption>{t("marking.guide")}</Caption>
                <HtmlContent html={activeAnswer.markingGuide} />
              </View>
            ) : null}

            {activeAnswer.pages.map((page) => (
              <MarkingLayer
                color={color}
                key={page.id}
                marking={markingByPageId[page.id] ?? page.marking}
                onChange={(next) => queueMarkingSave(page.id, next)}
                onNoteRequested={(point) => setPendingNote({ pageId: page.id, ...point })}
                pageHeight={page.height ?? 0}
                pageUrl={page.fileUrl}
                pageWidth={page.width ?? 0}
                penWidth={penWidth}
                tool={tool}
                width={pageWidth}
              />
            ))}

            {pendingNote ? (
              <View style={styles.row}>
                <TextInput
                  autoFocus
                  onChangeText={setNoteText}
                  placeholder={t("marking.note")}
                  placeholderTextColor={colors.placeholder}
                  style={styles.noteInput}
                  value={noteText}
                />
                <Button label={t("marking.note")} onPress={addNote} size="sm" />
              </View>
            ) : null}

            <View style={styles.row}>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setMarkInput}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                style={styles.markInput}
                value={markInput}
              />
              <Caption tone="faint">{t("marking.outOf", { marks: activeAnswer.marks })}</Caption>
              <Button
                isBusy={isBusy}
                label={isLastAnswerOfPaper ? t("marking.saveAndSubmit") : t("marking.saveMark")}
                onPress={() => void saveMarkAndAdvance()}
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg },
  guide: { backgroundColor: colors.panelWarm, borderRadius: radius.sm, padding: spacing.md },
  markInput: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    minWidth: 80,
    padding: spacing.sm
  },
  noteInput: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    padding: spacing.sm
  },
  queueRow: {
    alignItems: "center",
    backgroundColor: colors.panelWarm,
    borderRadius: radius.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md
  },
  queueRowActive: { backgroundColor: colors.chipActive },
  row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
