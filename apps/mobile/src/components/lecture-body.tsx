import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LecturePlayer } from "@/src/components/lecture-player";
import { Body, Button, Caption, Card, Title } from "@/src/components/ui";
import type { ContentLecture } from "@/src/lib/api/content";
import { useFormat, useT } from "@/src/lib/locale";
import { colors, fonts, spacing } from "@/src/theme/tokens";

/** A lecture whose body is a PDF is a reading, not a video, and reads as one. */
export function getPdfMaterial(lecture: ContentLecture) {
  return lecture.materials.find((material) => material.fileType === "application/pdf") ?? null;
}

function MaterialRow({
  fileType,
  fileUrl,
  title
}: {
  fileType: string;
  fileUrl: string;
  title: string;
}): JSX.Element {
  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="link"
      onPress={() => {
        void WebBrowser.openBrowserAsync(fileUrl);
      }}
      style={styles.materialRow}
    >
      <View style={styles.materialText}>
        <Body numberOfLines={1}>{title}</Body>
        <Caption>{fileType}</Caption>
      </View>
      <Caption>↓</Caption>
    </Pressable>
  );
}

export function MaterialLinks({
  materials,
  title
}: {
  materials: ContentLecture["materials"];
  title: string;
}): JSX.Element | null {
  if (materials.length === 0) {
    return null;
  }

  return (
    <Card>
      <Title>{title}</Title>
      <View style={{ height: spacing.sm }} />
      {materials.map((material) => (
        <MaterialRow
          fileType={material.fileType}
          fileUrl={material.fileUrl}
          key={material.id}
          title={material.title}
        />
      ))}
    </Card>
  );
}

export function LectureBody({
  courseId,
  isCompleted,
  isMarking,
  lastViewedAt,
  lecture,
  onMarkComplete
}: {
  courseId: string;
  isCompleted: boolean;
  isMarking: boolean;
  lastViewedAt: string | null;
  lecture: ContentLecture;
  onMarkComplete: () => void;
}): JSX.Element {
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const pdf = getPdfMaterial(lecture);

  return (
    <View style={styles.bodyStack}>
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
          isCompleted={isCompleted}
          onWatched={onMarkComplete}
          title={lecture.title}
          videoUrl={lecture.videoUrl}
        />
      )}

      <View style={styles.badgesRow}>
        <Button
          disabled={isCompleted}
          isBusy={isMarking}
          label={
            isCompleted
              ? t("player.watchedDone")
              : isMarking
                ? t("player.savingProgress")
                : t("player.watched")
          }
          onPress={onMarkComplete}
          variant={isCompleted ? "outline" : "ink"}
        />
        <Button
          label={t("player.overview")}
          onPress={() => router.push({ params: { courseId }, pathname: "/courses/[courseId]" })}
          variant="outline"
        />
      </View>
      {lastViewedAt ? (
        <Caption tone="faint">
          {t("player.lastViewed", { date: format.dateTime(lastViewedAt) })}
        </Caption>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badgesRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  bodyStack: { gap: spacing.md },
  materialRow: {
    alignItems: "center",
    borderColor: colors.hairline,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    padding: spacing.md
  },
  materialText: { flex: 1, gap: 2 },
  panel: {
    backgroundColor: colors.panelWarm,
    padding: spacing.lg
  },
  textContent: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 28,
    padding: spacing.lg
  }
});
