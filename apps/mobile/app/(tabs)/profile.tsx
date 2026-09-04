import { locales, localeNames, type Locale } from "@mma/i18n";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  Badge,
  Body,
  Button,
  Card,
  Screen,
  SkeletonBlock,
  tabScrollInset,
  Title
} from "@/src/components/ui";
import {
  SkeletonBody,
  SkeletonCard,
  SkeletonHeader,
  SkeletonRows
} from "@/src/components/skeletons";
import { CurvedHeader, HeaderBar, ListGroup, ListRow } from "@/src/components/ui-layout";
import { Avatar, StreakTrack } from "@/src/components/ui-display";
import { getOwnProfile } from "@/src/lib/api/profiles";
import { useLocale, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useHasPassword, useSession, useSignOut } from "@/src/lib/use-session";
import { useStreak } from "@/src/lib/use-streak";
import { fonts, layout, radius, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

/**
 * The account.
 *
 * Identity is a plate lifted into the indigo header, and everything the student
 * can actually do is one list of rows under it — the same row component the
 * exams and payments screens use, so a tap here looks like a tap there.
 */

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

export default function ProfileScreen(): JSX.Element {
  const styles = useStyles();
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
    return (
      <Screen>
        <SkeletonHeader overlap={false} />
        <SkeletonBody tabInset>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={1} />
          <SkeletonRows leading="tile" rows={4} />
        </SkeletonBody>
      </Screen>
    );
  }

  // Signed out, this tab *is* the way in — so it goes straight to the sign-in
  // screen rather than to a page whose only content is a button to it.
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  // The session's flag is the one the API enforces against; the profile record
  // is only what is shown. They can disagree for a moment after a save, and the
  // session is the one to believe.
  const isProfileComplete = session.session.profileCompleted;
  const phone = profile?.studentProfile?.phone ?? profile?.teacherProfile?.phone ?? null;
  const name = profile?.user.name ?? session.user.name;
  const email = profile?.user.email ?? session.user.email;
  const photo =
    profile?.user.image ??
    profile?.studentProfile?.profilePhoto ??
    profile?.teacherProfile?.profilePhoto ??
    null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <CurvedHeader>
          <HeaderBar subtitle={t("nav.profile")} title={t("profile.detailsTitle")} />
        </CurvedHeader>

        <View style={styles.body}>
          {isPending ? (
            <SkeletonBlock height={140} style={styles.identitySkeleton} />
          ) : (
            <Card style={styles.identity}>
              <View style={styles.identityRow}>
                <Avatar name={name} photo={photo} size={68} />
                <View style={styles.identityText}>
                  <Text numberOfLines={1} style={styles.identityName}>
                    {name}
                  </Text>
                  <Text numberOfLines={1} style={styles.identityMeta}>
                    {email}
                  </Text>
                  {phone ? (
                    <Text numberOfLines={1} style={styles.identityMeta}>
                      {phone}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.identityBadges}>
                <Badge tone="info">{session.session.role}</Badge>
              </View>
            </Card>
          )}

          <Card>
            <StreakTrack
              days={streak.days}
              label={t("dash.streak")}
              streakCount={streak.streakCount}
            />
          </Card>

          {/* The one thing that stays a standalone card rather than a row: an
              incomplete profile blocks the account, and that is not a fact to
              bury in a list. */}
          <Card tone={isProfileComplete ? undefined : "gold"}>
            <Title>
              {isProfileComplete ? t("profile.detailsTitle") : t("profile.completeTitle")}
            </Title>
            <View style={{ height: spacing.sm }} />
            <Body muted>
              {isProfileComplete ? t("profile.detailsLead") : t("profile.completeLead")}
            </Body>
            <View style={{ height: spacing.lg }} />
            <Button
              icon={isProfileComplete ? "create" : "arrow-forward"}
              label={isProfileComplete ? t("profile.editProfile") : t("profile.completeProfile")}
              onPress={() => router.push("/profile-complete")}
              stretch
              variant={isProfileComplete ? "outline" : "ink"}
            />
          </Card>

          <ListGroup title={t("nav.myCourses")}>
            <ListRow
              icon="document-text"
              onPress={() => router.push("/exams")}
              tint="coral"
              title={t("exams.title")}
            />
            <ListRow
              icon="card"
              onPress={() => router.push("/payments")}
              tint="mint"
              title={t("profile.viewPayments")}
            />
            <ListRow
              icon="chatbubble-ellipses"
              isLast
              onPress={() => router.push("/messages/new")}
              tint="brand"
              title={t("messages.new")}
            />
          </ListGroup>

          <ListGroup title={t("locale.label")}>
            <ListRow
              icon="globe"
              tint="sky"
              title={t("locale.label")}
              trailing={<LanguageSwitcher />}
            />
            {hasPassword ? (
              <ListRow
                icon="key"
                onPress={() => router.push("/change-password")}
                tint="gold"
                title={t("profile.changePassword")}
              />
            ) : null}
            <ListRow
              icon="information-circle"
              onPress={() => router.push("/about")}
              tint="lilac"
              title={t("about.title")}
            />
            <ListRow
              icon="mail"
              onPress={() => router.push("/contact")}
              tint="mint"
              title={t("contact.title")}
            />
            <ListRow
              icon="bug"
              isLast
              onPress={() => router.push("/bug-report")}
              tint="coral"
              title={t("profile.reportBug")}
            />
          </ListGroup>

          <ListGroup>
            <ListRow
              icon="log-out"
              isBusy={signOut.isPending}
              isDestructive
              isLast
              onPress={() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                signOut.mutate(undefined, {
                  onSuccess: () => {
                    router.replace("/sign-in");
                  }
                });
              }}
              tint="coral"
              title={t("profile.signOut")}
            />
          </ListGroup>
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  body: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  identity: { gap: spacing.lg, marginTop: -layout.headerOverlap },
  identityBadges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  identityMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
  identityName: { color: colors.ink, fontFamily: fonts.display, fontSize: 21, lineHeight: 28 },
  identityRow: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  identitySkeleton: { borderRadius: radius.square, marginTop: -layout.headerOverlap },
  identityText: { flex: 1, gap: 1 },
  languageLabel: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  languageLabelActive: { color: colors.onAccent },
  languagePill: {
    backgroundColor: colors.panelWarm,
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: spacing.md
  },
  languagePillActive: { backgroundColor: colors.accent },
  languageRow: { flexDirection: "row", gap: 6 },
  scroll: { paddingBottom: tabScrollInset }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
