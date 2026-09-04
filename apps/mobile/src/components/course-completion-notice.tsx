import type { JSX } from "react";
import { Pressable, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { Body, Title } from "@/src/components/ui";
import { IconTile } from "@/src/components/ui-display";
import { useT } from "@/src/lib/locale";
import { radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

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
  const styles = useStyles();
  const colors = useThemeColors();
  const t = useT();

  return (
    <View style={styles.notice}>
      <IconTile icon="trophy" size={44} tint="mint" />
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
        <Ionicons color={colors.muted} name="close" size={20} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  notice: {
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderRadius: radius.square,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  text: { flex: 1, gap: spacing.xs }
}));
