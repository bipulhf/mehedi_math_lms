import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { JSX } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LecturePlayer } from "@/src/components/lecture-player";
import { Body, Button, Caption, Heading, Screen, SkeletonBlock } from "@/src/components/ui";
import { type ContentMaterial, getLecturePreview } from "@/src/lib/api/content";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { colors, fonts, spacing } from "@/src/theme/tokens";

function getPdfMaterial(materials: readonly ContentMaterial[]): ContentMaterial | null {
  return materials.find((material) => material.fileType === "application/pdf") ?? null;
}

/**
 * A free class, played full-screen. Only lessons the outline marks `isPreview`
 * reach this route — the body comes from a public endpoint that refuses
 * anything else, so the route can never show a paid lesson.
 */
export default function PreviewScreen(): JSX.Element {
  const { lectureId } = useLocalSearchParams<{ lectureId: string }>();
  const t = useT();
  const format = useFormat();

  const {
    data: lecture,
    isError,
    isPending
  } = useQuery({
    queryFn: () => getLecturePreview(lectureId),
    queryKey: queryKeys.lecturePreview(lectureId)
  });

  if (isPending) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={28} width="70%" />
          <SkeletonBlock height={14} />
          <SkeletonBlock height={200} />
        </ScrollView>
      </Screen>
    );
  }

  if (isError || !lecture) {
    return (
      <Screen style={styles.padded}>
        <Body muted>{t("detail.previewUnavailable")}</Body>
      </Screen>
    );
  }

  const pdf = getPdfMaterial(lecture.materials);
  const minutes = lecture.durationSeconds ? Math.round(lecture.durationSeconds / 60) : 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: lecture.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>{lecture.title}</Heading>
        {minutes > 0 ? (
          <Caption>{t("course.minutes", { count: format.number(minutes) })}</Caption>
        ) : null}

        {lecture.description ? (
          <View style={styles.panel}>
            <Body muted>{lecture.description}</Body>
          </View>
        ) : null}

        {pdf !== null ? (
          <View style={styles.panel}>
            <Body muted>{t("player.pdfLead")}</Body>
            <View style={{ height: spacing.md }} />
            <Button
              label={t("player.openPdf")}
              onPress={() => {
                void WebBrowser.openBrowserAsync(pdf.fileUrl);
              }}
              variant="outline"
            />
          </View>
        ) : lecture.type === "TEXT" ? (
          <Text style={styles.textContent}>{lecture.content ?? ""}</Text>
        ) : (
          <LecturePlayer
            isCompleted={false}
            onWatched={() => {
              // A preview has no progress to record.
            }}
            title={lecture.title}
            videoUrl={lecture.videoUrl}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg },
  padded: { padding: spacing.lg },
  panel: { backgroundColor: colors.panelWarm, padding: spacing.lg },
  textContent: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 28,
    padding: spacing.lg
  }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
