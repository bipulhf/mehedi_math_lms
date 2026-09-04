import { BottomSheet, RNHostView, type SnapPoint } from "@expo/ui";
import type { JSX, ReactNode } from "react";
import { Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { fonts, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * The app's bottom sheet: the platform's own, with our colours on it.
 *
 * This is `@expo/ui`'s `BottomSheet` — a Material 3 `ModalBottomSheet` on
 * Android and a `UISheetPresentationController` on iOS. That matters because a
 * sheet is mostly *behaviour*: it follows your thumb, flings shut with
 * velocity, fades its scrim in proportion to the drag, and answers the back
 * gesture. A React Native `Modal` with `animationType="slide"` has none of
 * that — it plays one fixed slide and waits for a tap, which is exactly why a
 * hand-rolled one reads as a web drawer on a phone.
 *
 * It was hand-rolled here for a while because the native sheet came up as a
 * black slab: on Android its surface colour comes from the **Compose** theme,
 * which follows the system dark mode, not from anything the app's palette says.
 * `containerColor` is the answer — it paints the sheet's own chrome, drag
 * indicator zone included — and with it set there is no reason to give up the
 * native behaviour.
 *
 * `children` are ordinary React Native views, so they do **not** inherit a
 * content colour from the sheet: everything inside still styles itself.
 *
 * They also do not inherit a **width**. Android hosts them inside a Compose
 * `Column`, which measures to its content's intrinsic width — so a React Native
 * `width: "100%"` has no parent width to resolve against and the whole sheet
 * renders as one narrow column with the rest of the sheet empty. The content
 * root is therefore given the window width in points, explicitly.
 *
 * **The content root must be wrapped in `RNHostView`**, and a scrollable inside
 * the sheet is why. Material3 shows the sheet in its **own dialog window**, so
 * a React Native view placed straight into the Compose tree has no React root
 * above it. `ReactScrollView` asks for one on the first touch it intercepts,
 * and `RootViewUtil.getRootView` asserts rather than returning null:
 *
 *     java.lang.AssertionError
 *       at com.facebook.react.uimanager.RootViewUtil.getRootView
 *       at ...events.NativeGestureUtil.notifyNativeGestureStarted
 *       at ...views.scroll.ReactScrollView.onInterceptTouchEvent
 *
 * That is a hard native crash — the process dies the moment a finger drags on
 * any list in the sheet, `ScrollView`, `FlatList` and `FlashList` alike, since
 * all of them take that path. `RNHostView` is the supported bridge back into
 * React Native from a Compose tree, and it also relays nested scroll to the
 * sheet, so dragging a list that is already at its top still expands or settles
 * the sheet instead of dead-ending.
 */
export function Sheet({
  children,
  contentStyle,
  isPresented,
  onDismiss,
  snapPoints,
  title
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  isPresented: boolean;
  onDismiss: () => void;
  /** Heights the sheet may rest at. Omitted, it sizes to its content. */
  snapPoints?: readonly SnapPoint[];
  /** Draws the header row: the title, and a close key on the right. */
  title?: string;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const t = useT();

  return (
    <BottomSheet
      containerColor={colors.background}
      // The sheet paints its own chrome; the content brings its own padding.
      contentPadding={0}
      contentColor={colors.ink}
      isPresented={isPresented}
      onDismiss={onDismiss}
      scrimColor="rgba(22, 26, 35, 0.45)"
      showDragIndicator
      {...(snapPoints === undefined ? {} : { snapPoints: [...snapPoints] })}
    >
      {/* `matchContents`, so the host reports the content's height back to the
          sheet and the sheet still sizes itself to what is in it. */}
      <RNHostView matchContents>
        <View
          style={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.lg), width },
            contentStyle
          ]}
        >
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
      </RNHostView>
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  content: { backgroundColor: colors.background },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingVertical: spacing.sm
  },
  title: { color: colors.ink, flex: 1, fontFamily: fonts.display, fontSize: 22, lineHeight: 30 }
}));
