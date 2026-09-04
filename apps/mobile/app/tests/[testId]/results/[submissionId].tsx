import { MathBody } from "@/src/components/math/math-body";
import { useQueries } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";

import { CourseCompletionNotice } from "@/src/components/course-completion-notice";
import { HtmlContent } from "@/src/components/html-content";
import { MarkingLayer } from "@/src/components/marking-layer";
import { ScriptChallengePanel } from "@/src/components/script-challenge-panel";
import { Badge, Button, Caption, Card, IconButton, Screen, SkeletonBlock } from "@/src/components/ui";
import { CurvedHeader, HeaderBar } from "@/src/components/ui-layout";
import { ProgressRing } from "@/src/components/ui-display";
import { getSubmissionDetail, getTestDetail } from "@/src/lib/api/tests";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * What a submitted attempt shows: the headline score while the attempt is
 * ungraded, then each question with the student's answer once it is.
 */
export default function SubmissionResultScreen(): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  // A page is laid out inside a card, so the drawable width is the screen less
  // the screen padding and the card's own.
  const pageWidth = Math.max(160, windowWidth - 96);
  const { submissionId, testId } = useLocalSearchParams<{
    submissionId: string;
    testId: string;
  }>();
  const router = useRouter();
  const t = useT();
  const [isCelebrating, setIsCelebrating] = useState(false);
  // `courseCompletedJustNow` is only true on the response seeded right after
  // submitting — a background refetch reads it fresh and gets false. The ref
  // keeps that from taking the banner away again.
  const hasCelebrated = useRef(false);

  const [testQuery, submissionQuery] = useQueries({
    queries: [
      {
        queryFn: () => getTestDetail(testId, true),
        queryKey: queryKeys.testWithAnswers(testId)
      },
      {
        queryFn: () => getSubmissionDetail(submissionId),
        queryKey: queryKeys.testSubmission(submissionId)
      }
    ]
  });

  const test = testQuery?.data ?? null;
  const submission = submissionQuery?.data ?? null;
  const isLoading = Boolean(testQuery?.isPending) || Boolean(submissionQuery?.isPending);

  useEffect(() => {
    if (submission?.courseCompletedJustNow === true && !hasCelebrated.current) {
      hasCelebrated.current = true;
      setIsCelebrating(true);
    }
  }, [submission]);

  if (isLoading || !test || !submission) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={26} width="60%" />
          <SkeletonBlock height={90} />
          <SkeletonBlock height={120} />
        </ScrollView>
      </Screen>
    );
  }

  const answerMap = new Map(submission.answers.map((answer) => [answer.questionId, answer]));

  const maxScore = submission.maxScore ?? test.totalMarks;
  const percent = maxScore <= 0 ? 0 : ((submission.score ?? 0) / maxScore) * 100;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      {/* The score is the screen. A student who just submitted wants the number
          and the verdict; everything else is detail under it. */}
      <CurvedHeader overlap={false} style={styles.resultHeader}>
        <HeaderBar
          left={
            <IconButton
              accessibilityLabel={t("common.back")}
              icon="chevron-back"
              onPress={() => router.back()}
              tone="onPaper"
            />
          }
          subtitle={
            submission.status === "GRADED" ? t("test.finalResult") : t("test.submissionReceived")
          }
          title={test.title}
        />
        <View style={styles.resultScoreRow}>
          <ProgressRing label={t("test.score", { max: maxScore, score: submission.score ?? 0 })} percent={percent} size={84} tone="onColor" />
          <View style={styles.resultScoreText}>
            <Text style={styles.resultScore}>
              {submission.score ?? 0}
              <Text style={styles.resultScoreMax}>/{maxScore}</Text>
            </Text>
            {submission.passed !== null ? (
              <View
                style={[
                  styles.verdict,
                  { backgroundColor: submission.passed ? colors.success : colors.error }
                ]}
              >
                <Text style={styles.verdictText}>
                  {submission.passed ? t("test.passed") : t("test.failed")}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </CurvedHeader>

      <ScrollView contentContainerStyle={styles.content}>
        {isCelebrating ? (
          <CourseCompletionNotice onDismiss={() => setIsCelebrating(false)} />
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <View style={styles.badgesRow}>
            <Badge tone="quiet">
              {t("test.attemptLabel", { number: submission.attemptNumber })}
            </Badge>
            <Badge tone={submission.status === "GRADED" ? "success" : "info"}>
              {submission.status}
            </Badge>
            {test.passingScore !== null ? (
              <Badge tone="attention">{t("test.passScore", { count: test.passingScore })}</Badge>
            ) : null}
          </View>
          <Button
            icon="time"
            label={t("test.viewHistory")}
            stretch
            variant="outline"
            onPress={() => router.push({ params: { testId }, pathname: "/tests/[testId]/history" })}
          />
        </Card>

        {test.type === "WRITTEN" ? (
          <ScriptChallengePanel
            canRaise={submission.status === "GRADED"}
            submissionId={submissionId}
          />
        ) : null}

        {test.questions.map((question) => {
          const answer = answerMap.get(question.id);

          return (
            <Card key={question.id} style={{ gap: spacing.sm }}>
              <Caption>
                {test.type === "WRITTEN" ? t("ab.written") : t("ab.mcq")} · {question.marks}
              </Caption>
              <HtmlContent html={question.questionText} />
              {test.type === "MCQ" ? (
                <View style={{ gap: spacing.xs }}>
                  {question.options.map((option) => {
                    const isSelected = option.id === answer?.selectedOptionId;
                    const isCorrectOption = option.isCorrect === true;
                    const isWrongPick = isSelected && !isCorrectOption;

                    return (
                      <View
                        key={option.id}
                        style={[
                          styles.optionRow,
                          isCorrectOption
                            ? styles.optionRowCorrect
                            : isWrongPick
                              ? styles.optionRowWrong
                              : null
                        ]}
                      >
                        <MathBody text={option.optionText} />
                        <View style={styles.badgesRow}>
                          {isSelected ? (
                            <View
                              style={[
                                styles.outcomePill,
                                { borderColor: isCorrectOption ? colors.correct : colors.error }
                              ]}
                            >
                              <Text
                                style={[
                                  styles.outcomePillText,
                                  { color: isCorrectOption ? colors.correct : colors.error }
                                ]}
                              >
                                {t("test.yourAnswer")}
                              </Text>
                            </View>
                          ) : null}
                          {isCorrectOption ? (
                            <View style={[styles.outcomePill, { borderColor: colors.correct }]}>
                              <Text style={[styles.outcomePillText, { color: colors.correct }]}>
                                {t("test.correctAnswer")}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                  {!answer?.selectedOptionId ? <Caption>{t("test.noOption")}</Caption> : null}
                </View>
              ) : (answer?.scriptPages.length ?? 0) === 0 ? (
                <Caption>{t("test.noAnswer")}</Caption>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Caption>{t("test.yourAnswer")}</Caption>
                  {answer?.scriptPages.map((page) => (
                    <MarkingLayer
                      color="RED"
                      key={page.id}
                      marking={page.marking}
                      pageHeight={page.height ?? 0}
                      pageUrl={page.fileUrl}
                      pageWidth={page.width ?? 0}
                      penWidth="MEDIUM"
                      tool="PEN"
                      width={pageWidth}
                    />
                  ))}
                </View>
              )}
              <View style={styles.badgesRow}>
                <Caption>{t("test.awardedMarks", { count: answer?.awardedMarks ?? 0 })}</Caption>
                {answer?.isCorrect !== null && answer?.isCorrect !== undefined ? (
                  <View
                    style={[
                      styles.outcomePill,
                      { borderColor: answer.isCorrect ? colors.correct : colors.error }
                    ]}
                  >
                    <Text
                      style={[
                        styles.outcomePillText,
                        { color: answer.isCorrect ? colors.correct : colors.error }
                      ]}
                    >
                      {answer.isCorrect ? t("test.markedCorrect") : t("test.markedIncorrect")}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  badgesRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl },
  optionRow: {
    alignItems: "center",
    backgroundColor: colors.panelWarm,
    borderColor: "transparent",
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.md
  },
  optionRowCorrect: { backgroundColor: colors.successSoft, borderColor: colors.correct },
  optionRowWrong: { backgroundColor: colors.errorSoft, borderColor: colors.error },
  outcomePill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  outcomePillText: { fontFamily: fonts.displaySemiBold, fontSize: 12 },
  resultHeader: { gap: spacing.xl, paddingBottom: spacing.xl },
  resultScore: { color: colors.paper, fontFamily: fonts.display, fontSize: 40 },
  resultScoreMax: { color: colors.paper, fontFamily: fonts.numeric, fontSize: 18, opacity: 0.8 },
  resultScoreRow: { alignItems: "center", flexDirection: "row", gap: spacing.xl },
  resultScoreText: { alignItems: "flex-start", flex: 1, gap: spacing.sm },
  verdict: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7
  },
  verdictText: { color: colors.paper, fontFamily: fonts.displayBold, fontSize: 13, letterSpacing: 0.4 }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
