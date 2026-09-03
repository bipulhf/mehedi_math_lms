import { locales, localeNames, type Locale } from "@mma/i18n";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Badge, Body, Button, Card, Heading, Screen, ScreenSkeleton, SkeletonBlock, Title } from "@/src/components/ui";
import { Avatar, StreakTrack } from "@/src/components/ui-display";
import { SignInPrompt } from "@/src/components/sign-in-prompt";
import { getOwnProfile } from "@/src/lib/api/profiles";
import { useLocale, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useHasPassword, useSession, useSignOut } from "@/src/lib/use-session";
import { useStreak } from "@/src/lib/use-streak";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

function sfToIon(sf: string): string {
  const map: Record<string, string> = {
    "globe": "globe-outline",
    "info.circle": "information-circle",
    "envelope": "mail",
    "ladybug": "bug",
    "key": "key",
    "doc.text": "document-text",
    "creditcard": "card",
    "plus.bubble": "chatbubble-ellipses",
    "rectangle.portrait.and.arrow.right": "log-out"
  };
  return map[sf] ?? "cube";
}

/**
 * Two pills, both always visible, mirroring the web switcher. A single toggle
 * that names only the language you are not in is a puzzle for readers who may
 * not read the label.
 */
function LanguageSwitcher(): JSX.Element {
  const styles = useStyles();
  const { locale, setLocale } = useLocale();

  return (
    <View style={styles.languageRow}>
      {locales.map((option: Locale) => {
        const isActive = option === locale;

        return (
          <Pressable
            accessibilityLabel={localeNames[option]}
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              void Haptics.selectionAsync();
              setLocale(option);
            }}
            style={[styles.languagePill, isActive ? styles.languagePillActive : null]}
          >
            <Text style={[styles.languageLabel, isActive ? styles.languageLabelActive : null]}>
              {localeNames[option]}
            </Text>
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
  icon,
  isBusy = false,
  isLast = false,
  label,
  onPress
}: {
  icon?: string;
  isBusy?: boolean;
  isLast?: boolean;
  label: string;
  onPress: () => void;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy }}
      disabled={isBusy}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.settingsRow,
        isLast ? null : styles.settingsRowDivider,
        pressed ? styles.rowPressed : null
      ]}
    >
      <View style={styles.settingsRowLeft}>
        {icon ? (
          <View style={styles.settingsIconWrap}>
            <Ionicons color={colors.muted} name={sfToIon(icon) as never} size={16} />
          </View>
        ) : null}
        <Text style={styles.settingsRowLabel}>{isBusy ? `${label}…` : label}</Text>
      </View>
      <Ionicons color={colors.mutedFaint} name="chevron-forward" size={14} />
    </Pressable>
  );
}

export default function ProfileScreen(): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const hasPassword = useHasPassword();
  const signOut = useSignOut();
  const streak = useStreak();
  const { data: profile, isPending } = useQuery({
    enabled: Boolean(session),
    queryFn: getOwnProfile,
    queryKey: queryKeys.profile()
  });

  if (isSessionPending) {
    return <ScreenSkeleton noHeader rows={2} />;
  }

  if (!session) {
    return (
      <Screen noHeader style={styles.content}>
        <SignInPrompt />
        <LanguageSwitcher />
      </Screen>
    );
  }

  // The session's flag is the one the API enforces against; the profile record
  // is only what is shown. They can disagree for a moment after a save, and the
  // session is the one to believe.
  const isProfileComplete = session.session.profileCompleted;
  const phone = profile?.studentProfile?.phone ?? profile?.teacherProfile?.phone ?? null;

  return (
    <Screen noHeader>
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
                photo={
                  profile?.user.image ??
                  profile?.studentProfile?.profilePhoto ??
                  profile?.teacherProfile?.profilePhoto ??
                  null
                }
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
              <StreakTrack
                days={streak.days}
                label={t("dash.streak")}
                streakCount={streak.streakCount}
              />
            </View>
          </Card>
        )}

        {/* The one row that stays a standalone, emphasised card rather than a
            settings row -- an incomplete profile blocks the account, and that
            is not a fact to bury in a list. */}
        <Card>
          <Title>
            {isProfileComplete ? t("profile.detailsTitle") : t("profile.completeTitle")}
          </Title>
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

        <View style={styles.groupLabel}>
          <Text style={styles.groupLabelText}>{t("locale.label").toUpperCase()}</Text>
        </View>
        <Card style={styles.settingsCard}>
          <View style={[styles.settingsRow, styles.settingsRowDivider]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons color={colors.muted} name="globe-outline" size={16} />
              </View>
              <Text style={styles.settingsRowLabel}>{t("locale.label")}</Text>
            </View>
            <LanguageSwitcher />
          </View>
          <SettingsRow icon="info.circle" label={t("about.title")} onPress={() => router.push("/about")} />
          <SettingsRow icon="envelope" label={t("contact.title")} onPress={() => router.push("/contact")} />
          <SettingsRow icon="ladybug" label={t("profile.reportBug")} onPress={() => router.push("/bug-report")} />
          {hasPassword ? (
            <SettingsRow
              icon="key"
              label={t("profile.changePassword")}
              onPress={() => router.push("/change-password")}
            />
          ) : null}
          <SettingsRow icon="doc.text" label={t("exams.title")} onPress={() => router.push("/exams")} />
          <SettingsRow icon="creditcard" label={t("profile.viewPayments")} onPress={() => router.push("/payments")} />
          <SettingsRow icon="plus.bubble" label={t("messages.new")} onPress={() => router.push("/messages/new")} />
          <SettingsRow
            icon="rectangle.portrait.and.arrow.right"
            isBusy={signOut.isPending}
            isLast
            label={t("profile.signOut")}
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

const useStyles = makeStyles((colors) => ({
  content: { gap: spacing.lg, padding: spacing.lg },
  groupLabel: { paddingHorizontal: spacing.sm, paddingTop: spacing.md },
  groupLabelText: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: "uppercase"
  },
  identityStreak: { paddingTop: spacing.lg },
  languageLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  languageLabelActive: { color: colors.ink },
  languagePill: {
    backgroundColor: colors.panelWarm,
    borderColor: colors.hairlineFaint,
    borderRadius: radius.full,
    borderWidth: 0.5,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  languagePillActive: { backgroundColor: colors.chipActive, borderColor: colors.accent },
  languageRow: { flexDirection: "row", gap: spacing.sm },
  profileIdentity: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  profileText: { flex: 1, gap: spacing.xs },
  rowPressed: { backgroundColor: colors.rowHover },
  settingsCard: { overflow: "hidden", padding: 0 },
  settingsIconWrap: {
    alignItems: "center",
    backgroundColor: colors.panelWarm,
    borderRadius: 7,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  settingsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  settingsRowDivider: { borderBottomColor: colors.hairlineFaint, borderBottomWidth: 0.5 },
  settingsRowLabel: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 15 },
  settingsRowLeft: { alignItems: "center", flexDirection: "row", gap: spacing.sm }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
