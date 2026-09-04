import { maxScriptPagesPerAnswer } from "@mma/shared";
import { Image } from "expo-image";
import type { JSX } from "react";
import { useState } from "react";
import { Alert, View } from "react-native";

import { Body, Button, Caption } from "@/src/components/ui";
import type { ScriptPageView } from "@/src/lib/api/tests";
import { addScriptPage, removeScriptPage, reorderScriptPages } from "@/src/lib/api/tests";
import { pickScriptPage, uploadScriptPage } from "@/src/lib/script-capture";
import { useT } from "@/src/lib/locale";
import { radius, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

interface AnswerScriptUploaderProps {
  onPagesChange: (pages: readonly ScriptPageView[]) => void;
  pages: readonly ScriptPageView[];
  questionId: string;
  submissionId: string;
}

/**
 * The student's Answer Script for one question: photograph each page, put them
 * in the order they were written, take one back if it came out unreadable.
 *
 * Rotation is applied before the upload rather than stored, because no original
 * is kept — the page is stored the way it is turned here (ADR-0009).
 */
export function AnswerScriptUploader({
  onPagesChange,
  pages,
  questionId,
  submissionId
}: AnswerScriptUploaderProps): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const [isBusy, setIsBusy] = useState(false);
  // A dimmed button with an ellipsis was the only sign a page was going up,
  // and a photograph over mobile data is not a quick round trip. The S3 PUT
  // reports no progress, so this names the step rather than a percentage.
  const [phase, setPhase] = useState<"PREPARING" | "SAVING" | "UPLOADING" | null>(null);
  const [rotation, setRotation] = useState(0);
  const isFull = pages.length >= maxScriptPagesPerAnswer;

  const addPage = async (source: "CAMERA" | "LIBRARY"): Promise<void> => {
    setIsBusy(true);
    setPhase("PREPARING");

    try {
      const captured = await pickScriptPage({ rotation, source });

      if (!captured) {
        return;
      }

      setPhase("UPLOADING");
      const upload = await uploadScriptPage(captured);

      setPhase("SAVING");
      onPagesChange(await addScriptPage(submissionId, { questionId, uploadId: upload.id }));
      setRotation(0);
    } catch (error) {
      Alert.alert(
        t("script.uploadFailed"),
        error instanceof Error ? error.message : t("script.uploadFailed")
      );
    } finally {
      setPhase(null);
      setIsBusy(false);
    }
  };

  const movePage = async (pageId: string, direction: -1 | 1): Promise<void> => {
    const currentIndex = pages.findIndex((page) => page.id === pageId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= pages.length) {
      return;
    }

    const reordered = [...pages];
    const [moved] = reordered.splice(currentIndex, 1);

    if (!moved) {
      return;
    }

    reordered.splice(targetIndex, 0, moved);
    setIsBusy(true);

    try {
      onPagesChange(
        await reorderScriptPages(submissionId, {
          pageIds: reordered.map((page) => page.id),
          questionId
        })
      );
    } catch (error) {
      Alert.alert(
        t("script.reorderFailed"),
        error instanceof Error ? error.message : t("script.reorderFailed")
      );
    } finally {
      setIsBusy(false);
    }
  };

  const deletePage = async (pageId: string): Promise<void> => {
    setIsBusy(true);

    try {
      await removeScriptPage(pageId);
      onPagesChange(pages.filter((page) => page.id !== pageId));
    } catch (error) {
      Alert.alert(
        t("script.removeFailed"),
        error instanceof Error ? error.message : t("script.removeFailed")
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button
          disabled={isBusy || isFull}
          isBusy={isBusy}
          label={pages.length === 0 ? t("script.addFirstPage") : t("script.addAnotherPage")}
          onPress={() => void addPage("CAMERA")}
        />
        <Button
          disabled={isBusy || isFull}
          label={t("script.chooseFromGallery")}
          onPress={() => void addPage("LIBRARY")}
          variant="outline"
        />
        <Button
          disabled={isBusy || isFull}
          label={`${t("script.rotateNext")}${rotation === 0 ? "" : ` ${rotation}°`}`}
          onPress={() => setRotation((value) => (value + 90) % 360)}
          variant="outline"
        />
      </View>
      {phase === null ? (
        <Caption tone="faint">
          {t("script.pagesOf", { count: pages.length, total: maxScriptPagesPerAnswer })}
        </Caption>
      ) : (
        <View style={styles.progress}>
          <Caption>
            {t(
              phase === "PREPARING"
                ? "script.preparingOne"
                : phase === "UPLOADING"
                  ? "script.uploadingOne"
                  : "script.savingOne"
            )}
          </Caption>
        </View>
      )}

      {pages.length === 0 ? (
        <View style={styles.empty}>
          <Body muted>{t("script.empty")}</Body>
        </View>
      ) : (
        pages.map((page, index) => (
          <View key={page.id} style={styles.page}>
            <Image
              contentFit="contain"
              source={{ uri: page.fileUrl }}
              style={styles.thumbnail}
            />
            <View style={styles.pageActions}>
              <Caption>{t("script.page", { number: index + 1 })}</Caption>
              <View style={styles.pageButtons}>
                <Button
                  disabled={isBusy || index === 0}
                  label="←"
                  onPress={() => void movePage(page.id, -1)}
                  variant="outline"
                />
                <Button
                  disabled={isBusy || index === pages.length - 1}
                  label="→"
                  onPress={() => void movePage(page.id, 1)}
                  variant="outline"
                />
                <Button
                  disabled={isBusy}
                  label={t("script.remove")}
                  onPress={() => void deletePage(page.id)}
                  variant="outline"
                />
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  container: { gap: spacing.sm },
  empty: {
    backgroundColor: colors.panelWarm,
    borderRadius: radius.md,
    padding: spacing.lg
  },
  page: {
    backgroundColor: colors.panelWarm,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.sm
  },
  pageActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  pageButtons: { flexDirection: "row", gap: spacing.xs },
  progress: {
    backgroundColor: colors.panelWarm,
    borderRadius: radius.md,
    padding: spacing.sm
  },
  thumbnail: { borderRadius: radius.md, height: 220, width: "100%" }
}));
