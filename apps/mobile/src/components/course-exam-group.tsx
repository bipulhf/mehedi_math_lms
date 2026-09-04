import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { Text, View } from "react-native";

import { Badge, Body, Button, Caption, SkeletonBlock } from "@/src/components/ui";
import { AccordionRow, IconTile } from "@/src/components/ui-display";
import type { AssessmentChapterSummary } from "@/src/lib/api/tests";
import { listMySubmissions, listTestSubmissions } from "@/src/lib/api/tests";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

/**
 * Where one exam stands, from the reader's own point of view: how many papers
 * are still waiting for a teacher, or how the student did on their own attempt.
 *
 * Both come from the submissions the caller is already allowed to see, so the
 * line never needs an endpoint of its own.
 */
function ExamStatusLine({
  isStudent,
  testId
}: {
  isStudent: boolean;
  testId: string;
}): JSX.Element | null {
  const t = useT();
  const format = useFormat();

  const staffSubmissions = useQuery({
    enabled: !isStudent,
    queryFn: () => listTestSubmissions(testId),
    queryKey: queryKeys.testSubmissions(testId)
  });
  const myAttempts = useQuery({
    enabled: isStudent,
    queryFn: () => listMySubmissions(testId),
    queryKey: queryKeys.myTestSubmissions(testId)
  });

  if (isStudent) {
    const attempts = myAttempts.data ?? [];

    if (attempts.length === 0) {
      return <Badge tone="attention">{t("exams.notAttempted")}</Badge>;
    }

    // The best graded attempt is the one that counts, and an ungraded one is
    // still with a teacher.
    const graded = attempts.filter((attempt) => attempt.status === "GRADED");

    if (graded.length === 0) {
      return <Badge tone="attention">{t("exams.awaitingMarking")}</Badge>;
    }

    const best = graded.reduce((highest, attempt) =>
      (attempt.score ?? 0) > (highest.score ?? 0) ? attempt : highest
    );

    return (
      <Badge tone="neutral">
        {t("exams.yourScore")}: {format.number(best.score ?? 0)}/{format.number(best.maxScore ?? 0)}
      </Badge>
    );
  }

  const submissions = staffSubmissions.data ?? [];

  if (submissions.length === 0) {
    return <Badge tone="neutral">{t("exams.awaitingSubmissions")}</Badge>;
  }

  const waiting = submissions.filter((submission) => submission.status === "SUBMITTED").length;

  return (
    <>
      <Badge tone="neutral">
        {t("exams.submissionCount", { count: format.number(submissions.length) })}
      </Badge>
      <Badge tone={waiting > 0 ? "attention" : "neutral"}>
        {waiting > 0
          ? t("exams.pendingToMark", { count: format.number(waiting) })
          : t("exams.allMarked")}
      </Badge>
    </>
  );
}

/**
 * One course in the exams list, with its exams inside it.
 *
 * The chapters arrive already filtered — the screen owns the search box, so a
 * course that survived it has at least one exam worth showing. An exam leads
 * where the reader can act on it: a student's own attempt history, or the
 * grading queue for the teacher marking it.
 */
export function CourseExamGroup({
  chapters,
  courseTitle,
  isOpen,
  isPending,
  isStudent,
  onToggle,
  subtitle
}: {
  chapters: readonly AssessmentChapterSummary[];
  courseTitle: string;
  isOpen: boolean;
  isPending: boolean;
  isStudent: boolean;
  onToggle: () => void;
  subtitle: string;
}): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const examCount = chapters.reduce((total, chapter) => total + chapter.tests.length, 0);

  return (
    <AccordionRow
      isOpen={isOpen}
      meta={
        <Caption tone="faint">
          {isOpen && !isPending
            ? t("exams.examCount", { count: format.number(examCount) })
            : subtitle}
        </Caption>
      }
      onToggle={onToggle}
      title={courseTitle}
    >
      {isPending ? (
        <View style={{ gap: spacing.sm }}>
          <SkeletonBlock height={64} />
          <SkeletonBlock height={64} />
        </View>
      ) : chapters.length === 0 ? (
        <Body muted>{t("exams.noExams")}</Body>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {chapters.map((chapter) => (
            <View key={chapter.chapterId} style={{ gap: spacing.sm }}>
              <Caption tone="faint">{chapter.chapterTitle}</Caption>

              {chapter.tests.map((test) => (
                <View key={test.id} style={styles.examCard}>
                  <View style={styles.examHead}>
                    <IconTile
                      icon={test.type === "WRITTEN" ? "create" : "list"}
                      size={38}
                      tint={test.type === "WRITTEN" ? "coral" : "brand"}
                    />
                    <Text numberOfLines={2} style={styles.examTitle}>
                      {test.title}
                    </Text>
                  </View>
                  <Caption>
                    {format.number(test.questionCount)} {t("ab.questions")} ·{" "}
                    {format.number(test.totalMarks)} {t("qe.marks")}
                  </Caption>
                  <View style={styles.badgesRow}>
                    <Badge>
                      {test.type === "WRITTEN"
                        ? t("author.examKindWritten")
                        : t("author.examKindMcq")}
                    </Badge>
                    {isStudent ? null : (
                      <Badge tone={test.isPublished ? "neutral" : "attention"}>
                        {test.isPublished ? t("common.published") : t("common.draft")}
                      </Badge>
                    )}
                    <ExamStatusLine isStudent={isStudent} testId={test.id} />
                  </View>
                  <Button
                    icon={isStudent ? "trophy" : "checkmark-done"}
                    label={isStudent ? t("exams.seeResult") : t("exams.markPapers")}
                    size="sm"
                    stretch
                    onPress={() =>
                      router.push(
                        isStudent
                          ? { params: { testId: test.id }, pathname: "/tests/[testId]/history" }
                          : { params: { testId: test.id }, pathname: "/tests/[testId]/marking" }
                      )
                    }
                    variant="outline"
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </AccordionRow>
  );
}

const useStyles = makeStyles((colors) => ({
  badgesRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  examCard: {
    backgroundColor: colors.panelWarm,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md
  },
  examHead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  examTitle: { color: colors.ink, flex: 1, fontFamily: fonts.displaySemiBold, fontSize: 15, lineHeight: 21 }
}));
