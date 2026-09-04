import type { JSX, ReactNode } from "react";
import { Modal, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

/**
 * The app's bottom sheet.
 *
 * It is a plain React Native `Modal`, deliberately, and not `@expo/ui`'s
 * `BottomSheet`. That one is a Jetpack Compose `ModalBottomSheet` on Android and
 * it takes its surface colour from the **native** Compose theme rather than
 * from anything JavaScript can set — on a build whose Android theme is not
 * light, every sheet in the app renders as a black slab with our content
 * floating on it. There is no prop that fixes it; the colour is decided below
 * the bridge.
 *
 * So the sheet is ours: a dimmed backdrop that dismisses on press, a cream
 * panel with the app's curved top corners, a grab handle, and the safe area
 * cleared at the bottom. `onRequestClose` keeps the Android back gesture
 * working.
 */
export function Sheet({
  children,
  contentStyle,
  isPresented,
  onDismiss,
  title
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  isPresented: boolean;
  onDismiss: () => void;
  /** Draws the header row: the title, and a close key on the right. */
  title?: string;
}): JSX.Element {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const t = useT();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
      transparent
      visible={isPresented}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityElementsHidden
          accessibilityLabel={t("common.close")}
          importantForAccessibility="no"
          onPress={onDismiss}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.panel,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            contentStyle
          ]}
        >
          <View style={styles.handle} />
          {title === undefined ? null : (
            <View style={styles.header}>
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              <IconButton
                accessibilityLabel={t("common.close")}
                icon="close"
                onPress={onDismiss}
                size={38}
              />
            </View>
          )}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { backgroundColor: "rgba(22, 26, 35, 0.45)", flex: 1 },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.lineStrong,
    borderRadius: radius.full,
    height: 5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    width: 44
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  panel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.curve,
    borderTopRightRadius: radius.curve,
    maxHeight: "88%",
    width: "100%"
  },
  root: { flex: 1, justifyContent: "flex-end" },
  title: { color: colors.ink, flex: 1, fontFamily: fonts.display, fontSize: 22, lineHeight: 30 }
}));
