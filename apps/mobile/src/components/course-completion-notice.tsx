import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Body, Title } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { colors, radius, spacing } from "@/src/theme/tokens";

/**
 * The one moment in the app shell that earns a celebration: a student just
 * finished a whole course.
 *
 * Web fires confetti and a toast. Neither exists here — the app has no toast
 * layer and a confetti library would be a native dependency for one second of
 * animation — so it is a banner the student dismisses, which also survives the
 * one thing a toast does not: being looked at again a moment later.
 */
export function CourseCompletionNotice({ onDismiss }: { onDismiss: () => void }): JSX.Element {
  const t = useT();

  return (
    <View style={styles.notice}>
      <View style={styles.text}>
        <Title>{t("player.courseCompleted")}</Title>
        <Body muted>{t("player.courseCompletedToast")}</Body>
      </View>
      <Pressable
        accessibilityLabel={t("common.close")}
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={onDismiss}
      >
        <Text style={styles.dismiss}>&times;</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dismiss: { color: colors.muted, fontSize: 24 },
  notice: {
    alignItems: "flex-start",
    borderColor: colors.accent,
    borderRadius: radius.square,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  text: { flex: 1, gap: spacing.xs }
});
