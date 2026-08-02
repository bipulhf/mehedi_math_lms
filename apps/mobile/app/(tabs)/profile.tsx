import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

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
import { queryKeys } from "@/src/lib/query";
import { useSession, useSignOut } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

export default function ProfileScreen(): JSX.Element {
  const router = useRouter();
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
        <Heading>Profile</Heading>

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
          <Title>{isProfileComplete ? "Your details" : "Finish your profile"}</Title>
          <View style={{ height: spacing.sm }} />
          <Body muted>
            {isProfileComplete
              ? "Keep your contact details current so a teacher can reach you."
              : "Enrolment and most of the dashboard stay locked until this is done."}
          </Body>
          <View style={{ height: spacing.lg }} />
          <Button
            label={isProfileComplete ? "Edit profile" : "Complete profile"}
            onPress={() => router.push("/profile-complete")}
            variant={isProfileComplete ? "outline" : "primary"}
          />
        </Card>

        <Card>
          <Title>Report a problem</Title>
          <View style={{ height: spacing.sm }} />
          <Body muted>
            Something broken, missing or confusing? Tell us and it reaches the same queue the web
            app's reports do.
          </Body>
          <View style={{ height: spacing.lg }} />
          <Button
            label="Report a bug"
            onPress={() => router.push("/bug-report")}
            variant="outline"
          />
        </Card>

        <Card>
          <Title>Session</Title>
          <View style={{ height: spacing.sm }} />
          <Caption>Signed in on this device. Signing out clears the cached data too.</Caption>
          <View style={{ height: spacing.lg }} />
          <Button
            isBusy={signOut.isPending}
            label="Sign out"
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
  content: { gap: spacing.lg, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
