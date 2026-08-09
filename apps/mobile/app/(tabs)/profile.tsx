import { locales, localeNames, type Locale } from "@mma/i18n";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Heading,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { getOwnProfile } from "@/src/lib/api";
import { useLocale, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession, useSignOut } from "@/src/lib/use-session";
import { colors, radius, spacing } from "@/src/theme/tokens";

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

export default function ProfileScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const signOut = useSignOut();
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
            <Title>{profile?.user.name ?? session.user.name}</Title>
            <View style={{ height: spacing.xs }} />
            <Body muted>{profile?.user.email ?? session.user.email}</Body>
            {phone ? (
              <>
                <View style={{ height: spacing.xs }} />
                <Body muted>{phone}</Body>
              </>
            ) : null}
            <View style={{ height: spacing.md }} />
            <Badge>{session.session.role}</Badge>
          </Card>
        )}

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

        <Card>
          <Title>{t("locale.label")}</Title>
          <View style={{ height: spacing.md }} />
          <LanguageSwitcher />
        </Card>

        <Card>
          <Title>{t("profile.reportTitle")}</Title>
          <View style={{ height: spacing.sm }} />
          <Body muted>{t("profile.reportLead")}</Body>
          <View style={{ height: spacing.lg }} />
          <Button
            label={t("profile.reportBug")}
            onPress={() => router.push("/bug-report")}
            variant="outline"
          />
        </Card>

        <Card>
          <Title>{t("profile.security")}</Title>
          <View style={{ height: spacing.sm }} />
          <Body muted>{t("profile.securityLead")}</Body>
          <View style={{ height: spacing.lg }} />
          <Button
            label={t("profile.changePassword")}
            onPress={() => router.push("/change-password")}
            variant="outline"
          />
        </Card>

        <Card>
          <Title>{t("profile.paymentTitle")}</Title>
          <View style={{ height: spacing.sm }} />
          <Body muted>{t("profile.paymentLead")}</Body>
          <View style={{ height: spacing.lg }} />
          <Button
            label={t("profile.viewPayments")}
            onPress={() => router.push("/payments")}
            variant="outline"
          />
        </Card>

        <Card>
          <Title>{t("nav.messages")}</Title>
          <View style={{ height: spacing.sm }} />
          <Body muted>{t("messages.unavailableLead")}</Body>
          <View style={{ height: spacing.lg }} />
          <Button
            label={t("messages.new")}
            onPress={() => router.push("/messages/new")}
            variant="outline"
          />
        </Card>

        <Card>
          <Title>{t("profile.session")}</Title>
          <View style={{ height: spacing.sm }} />
          <Caption>{t("profile.signedInOn")}</Caption>
          <View style={{ height: spacing.lg }} />
          <Button
            isBusy={signOut.isPending}
            label={t("profile.signOut")}
            onPress={() => {
              signOut.mutate(undefined, {
                onSuccess: () => {
                  router.replace("/sign-in");
                }
              });
            }}
            variant="outline"
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  languagePill: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  languagePillActive: { backgroundColor: colors.chipActive, borderColor: colors.chipActive },
  languageRow: { flexDirection: "row", gap: spacing.sm }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
