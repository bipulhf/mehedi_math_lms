import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import type { JSX } from "react";
import { Pressable, StyleSheet } from "react-native";

import { HtmlContent } from "@/src/components/html-content";
import { Body, Caption, Card, EmptyState, SkeletonBlock, Title } from "@/src/components/ui";
import { getCourseRoutine } from "@/src/lib/api/routines";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { colors, spacing } from "@/src/theme/tokens";

/**
 * The routine as a student reads it: whichever halves the teacher published.
 *
 * The attachment opens in the browser rather than downloading — it is a PDF on
 * public storage, so unlike a certificate it needs no cookie replayed at it.
 */
export function CourseRoutinePanel({ courseId }: { courseId: string }): JSX.Element {
  const t = useT();

  const { data, isPending } = useQuery({
    queryFn: () => getCourseRoutine(courseId),
    queryKey: queryKeys.courseRoutine(courseId)
  });

  if (isPending) {
    return (
      <Card style={{ gap: spacing.sm }}>
        <SkeletonBlock height={20} width="50%" />
        <SkeletonBlock height={80} />
      </Card>
    );
  }

  // A failed load reads as "nothing published yet" rather than a stuck
  // skeleton — the query has already surfaced why on its own.
  const routine = data ?? null;

  if (routine === null) {
    return <EmptyState message={t("routine.empty")} title={t("routine.title")} />;
  }

  return (
    <>
      <Card style={{ gap: spacing.sm }}>
        <Title>{t("routine.title")}</Title>
        <Body muted>{t("routine.lead")}</Body>
      </Card>

      {routine.content ? (
        <Card>
          <HtmlContent html={routine.content} muted />
        </Card>
      ) : null}

      {routine.attachmentUrl ? (
        <Pressable
          onPress={() => {
            void WebBrowser.openBrowserAsync(routine.attachmentUrl ?? "");
          }}
          style={styles.attachmentRow}
        >
          <Body numberOfLines={1}>{routine.attachmentName ?? t("routine.openAttachment")}</Body>
          <Caption>↗</Caption>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  attachmentRow: {
    alignItems: "center",
    borderColor: colors.hairline,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  }
});
