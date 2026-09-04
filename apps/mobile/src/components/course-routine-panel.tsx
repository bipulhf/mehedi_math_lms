import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";

import Ionicons from "@expo/vector-icons/Ionicons";
import type { JSX } from "react";
import { Pressable } from "react-native";

import { HtmlContent } from "@/src/components/html-content";
import { Body, Card, EmptyState, SkeletonBlock, Title } from "@/src/components/ui";
import { getCourseRoutine } from "@/src/lib/api/routines";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * The routine as a student reads it: whichever halves the teacher published.
 *
 * The attachment opens in the browser rather than downloading — it is a PDF on
 * public storage, so unlike a certificate it needs no cookie replayed at it.
 */
export function CourseRoutinePanel({ courseId }: { courseId: string }): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
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
          accessibilityLabel={routine.attachmentName ?? t("routine.openAttachment")}
          accessibilityRole="link"
          onPress={() => {
            void WebBrowser.openBrowserAsync(routine.attachmentUrl ?? "");
          }}
          style={styles.attachmentRow}
        >
          <Ionicons color={colors.accent} name="document-attach" size={18} />
          <Body numberOfLines={1}>{routine.attachmentName ?? t("routine.openAttachment")}</Body>
          <Ionicons color={colors.accent} name="open-outline" size={16} />
        </Pressable>
      ) : null}
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  attachmentRow: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 48,
    padding: spacing.md
  }
}));
