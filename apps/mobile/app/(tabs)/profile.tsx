import { locales, localeNames, type Locale } from "@mma/i18n";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Heading,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  StreakTrack,
  Title
} from "@/src/components/ui";
import { getOwnProfile } from "@/src/lib/api";
import { useLocale, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession, useSignOut } from "@/src/lib/use-session";
import { useStreak } from "@/src/lib/use-streak";
import { colors, fonts, radius, spacing } from "@/src/theme/tokens";

/**
 * Two pills, both always visible, mirroring the web switcher. A single toggle
 * that names only the language you are not in is a puzzle for readers who may
 * not read the label.
 */
function LanguageSwitcher(): JSX.Element {
  const { locale, setLocale } = useLocale();

  return (
    <View style={styles.languageRow}>
      {locales.map((option: Locale) => {
        const isActive = option === locale;

        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => setLocale(option)}
            style={[styles.languagePill, isActive ? styles.languagePillActive : null]}
          >
            <Caption>{localeNames[option]}</Caption>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A grouped settings row — label, chevron, one tap away. What used to be nine
 * separate bordered cards (each with its own title and a paragraph repeating
 * what the label already said) is now one list, the OS-settings convention
 * every reference app in this redesign also lands on. The lead paragraphs
 * are gone on purpose: a row's destination screen carries whatever context
 * it needs, and nine explanatory sentences on the way there was the clutter
 * this consolidation exists to remove.
 */
function SettingsRow({
  isBusy = false,
  isLast = false,
  label,
  onPress
}: {
  isBusy?: boolean;
  isLast?: boolean;
  label: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy }}
      disabled={isBusy}
      onPress={onPress}
      style={[styles.settingsRow, isLast ? null : styles.settingsRowDivider]}
    >
      <Text style={styles.settingsRowLabel}>{isBusy ? `${label}…` : label}</Text>
      <Text style={styles.settingsRowChevron}>&#8250;</Text>
    </Pressable>
  );
}

export default function ProfileScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const signOut = useSignOut();
  const streak = useStreak();
  const { data: profile, isPending } = useQuery({
    enabled: Boolean(session),
    queryFn: getOwnProfile,
    queryKey: queryKeys.profile()
  });

  if (isSessionPending) {
    return <ScreenSkeleton rows={2} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  // The session's flag is the one the API enforces against; the profile record
  // is only what is shown. They can disagree for a moment after a save, and the
  // session is the one to believe.
  const isProfileComplete = session.session.profileCompleted;
  const phone = profile?.studentProfile?.phone ?? profile?.teacherProfile?.phone ?? null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>{t("nav.profile")}</Heading>

        {isPending ? (
          <Card>
            <SkeletonBlock height={20} width="50%" />
            <View style={{ height: spacing.sm }} />
            <SkeletonBlock height={14} width="70%" />
          </Card>
        ) : (
          <Card>
            <View style={styles.profileIdentity}>
              <Avatar
                name={profile?.user.name ?? session.user.name}
                photo={profile?.user.image ?? profile?.studentProfile?.profilePhoto ?? profile?.teacherProfile?.profilePhoto ?? null}
                size={72}
              />
              <View style={styles.profileText}>
                <Title>{profile?.user.name ?? session.user.name}</Title>
                <Body muted>{profile?.user.email ?? session.user.email}</Body>
              </View>
            </View>
            {phone ? (
              <>
                <View style={{ height: spacing.xs }} />
                <Body muted>{phone}</Body>
              </>
            ) : null}
            <View style={{ height: spacing.md }} />
            <Badge>{session.session.role}</Badge>
            <View style={styles.identityStreak}>
              <StreakTrack days={streak.days} label={t("dash.streak")} streakCount={streak.streakCount} />
            </View>
          </Card>
        )}

        {/* The one row that stays a standalone, emphasised card rather than a
            settings row -- an incomplete profile blocks the account, and that
            is not a fact to bury in a list. */}
        <Card>
          <Title>{isProfileComplete ? t("profile.detailsTitle") : t("profile.completeTitle")}</Title>
          <View style={{ height: spacing.sm }} />
          <Body muted>
            {isProfileComplete ? t("profile.detailsLead") : t("profile.completeLead")}
          </Body>
          <View style={{ height: spacing.lg }} />
          <Button
            label={isProfileComplete ? t("profile.editProfile") : t("profile.completeProfile")}
            onPress={() => router.push("/profile-complete")}
            variant={isProfileComplete ? "outline" : "ink"}
          />
        </Card>

        <Card style={styles.settingsCard}>
          <View style={[styles.settingsRow, styles.settingsRowDivider]}>
            <Text style={styles.settingsRowLabel}>{t("locale.label")}</Text>
            <LanguageSwitcher />
          </View>
          <SettingsRow label={t("about.title")} onPress={() => router.push("/about")} />
          <SettingsRow label={t("contact.title")} onPress={() => router.push("/contact")} />
          <SettingsRow label={t("profile.reportBug")} onPress={() => router.push("/bug-report")} />
          <SettingsRow
            label={t("profile.changePassword")}
            onPress={() => router.push("/change-password")}
          />
          <SettingsRow label={t("profile.viewPayments")} onPress={() => router.push("/payments")} />
          <SettingsRow label={t("messages.new")} onPress={() => router.push("/messages/new")} />
          <SettingsRow
            isBusy={signOut.isPending}
            isLast
            label={t("profile.signOut")}
            onPress={() => {
              signOut.mutate(undefined, {
                onSuccess: () => {
                  router.replace("/sign-in");
                }
              });
            }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  identityStreak: { paddingTop: spacing.lg },
  languagePill: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  languagePillActive: { backgroundColor: colors.chipActive, borderColor: colors.chipActive },
  languageRow: { flexDirection: "row", gap: spacing.sm },
  profileIdentity: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  profileText: { flex: 1, gap: spacing.xs },
  settingsCard: { padding: 0 },
  settingsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  settingsRowChevron: { color: colors.mutedFaint, fontSize: 20 },
  settingsRowDivider: { borderBottomColor: colors.hairlineFaint, borderBottomWidth: 1 },
  settingsRowLabel: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 16 }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
