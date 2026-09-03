import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import type { JSX, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Ionicons from "@expo/vector-icons/Ionicons";

import { Screen } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo bundled image asset
const mark = require("@/assets/images/splash-icon.png") as number;

/**
 * A rule with a word set into it, for the seam between the ways in.
 *
 * Google is the second way, not the first: the two this audience actually
 * uses — a handset and a code, or an address and a password — sit above the
 * line, and this separates them from the one that leaves the app.
 */
export function OrDivider({ label }: { label: string }): JSX.Element {
  const styles = useStyles();

  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export interface AuthScaffoldProps {
  children: ReactNode;
  /** A row under the plate — "new here? create an account", and its like. */
  footer?: ReactNode;
  lead: string;
  /** Where the back chevron goes. Explore, unless a screen has somewhere better. */
  onBack?: () => void;
  title: string;
}

/**
 * The shape all three ways in share: a mark, a sentence, one plate, one
 * footer.
 *
 * It exists because sign-in, sign-up and the password reset are the same
 * screen with different fields in the middle, and three copies of a layout
 * drift into three different layouts. There is no native header on any of
 * them — the brand is the header, and a bar reading "Sign in" above a screen
 * reading "Sign in" is 44 points of a phone spent saying it twice.
 */
export function AuthScaffold({
  children,
  footer,
  lead,
  onBack,
  title
}: AuthScaffoldProps): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();

  return (
    <Screen noHeader>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Pressable
              accessibilityLabel={t("common.back")}
              accessibilityRole="button"
              hitSlop={spacing.md}
              onPress={onBack ?? (() => router.replace("/explore"))}
              style={({ pressed }) => [styles.backButton, pressed ? styles.backPressed : null]}
            >
              <Ionicons color={colors.muted} name="chevron-back" size={22} />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Image contentFit="contain" source={mark} style={styles.mark} />
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroLead}>{lead}</Text>
          </View>

          {/* One plate, not a card per method: the ways in are alternatives to
              each other, and a card each reads as unrelated offers. */}
          <View style={styles.panel}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.hairlineFaint,
    borderRadius: radius.full,
    borderWidth: 0.5,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  backPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  content: { gap: spacing.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  dividerLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  dividerLine: { backgroundColor: colors.hairline, flex: 1, height: 0.5 },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  flex: { backgroundColor: colors.background, flex: 1 },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center"
  },
  hero: { alignItems: "center", gap: spacing.xs },
  heroLead: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    textAlign: "center"
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 36,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  mark: { height: 64, width: 64 },
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.hairlineFaint,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    // Elevation on light, nothing on dark: a white plate on a near-white page
    // has no contrast left to separate it, and DESIGN.md §2 forbids shadows
    // on the dark theme, where it does not need one.
    elevation: colors.shadowOpacity === 0 ? 0 : 3,
    gap: spacing.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: colors.shadowOpacity,
    shadowRadius: 16
  },
  topRow: { flexDirection: "row" }
}));
