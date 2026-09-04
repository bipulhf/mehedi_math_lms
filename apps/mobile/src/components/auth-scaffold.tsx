import { Stack, useRouter } from "expo-router";
import type { JSX, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLockup } from "@/src/components/brand-lockup";
import { Card, IconButton, Screen } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { fonts, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

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
 * The shape all three ways in share.
 *
 * Cream page, the brand lockup at the top, a headline set hard against the
 * left margin, and the form on one white plate. It is deliberately *not* the
 * coloured-header layout the signed-in screens use: arriving here should feel
 * like the front door of the app rather than another room inside it, and a
 * left-aligned headline over a single plate is the calmest way to say that.
 *
 * There is no native header on any of these screens — the brand is the header,
 * and a bar reading "Sign in" above a screen reading "Sign in" is 44 points of
 * a phone spent saying it twice.
 */
export function AuthScaffold({
  children,
  footer,
  lead,
  onBack,
  title
}: AuthScaffoldProps): JSX.Element {
  const styles = useStyles();
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
            <IconButton
              accessibilityLabel={t("common.back")}
              icon="chevron-back"
              onPress={onBack ?? (() => router.replace("/explore"))}
            />
          </View>

          <View style={styles.hero}>
            {/* Whose app this is, before it asks for anything. */}
            <BrandLockup onColor={false} />
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroLead}>{lead}</Text>
          </View>

          {/* One plate, not a card per method: the ways in are alternatives to
              each other, and a card each reads as unrelated offers. */}
          <Card style={styles.panel}>{children}</Card>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  dividerLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  dividerLine: { backgroundColor: colors.hairline, flex: 1, height: 1 },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  flex: { backgroundColor: colors.background, flex: 1 },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    paddingTop: spacing.sm
  },
  hero: { gap: spacing.sm },
  heroLead: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 40,
    marginTop: spacing.lg
  },
  panel: { gap: spacing.lg, padding: spacing.lg },
  topRow: { flexDirection: "row", paddingTop: spacing.sm }
}));
