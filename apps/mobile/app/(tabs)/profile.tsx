import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import {
  Badge,
  Body,
  BootIndicator,
  Button,
  Caption,
  Card,
  Heading,
  Screen,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { getOwnProfile } from "@/src/lib/api";
import { mobileEnv } from "@/src/lib/env";
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
    return <BootIndicator />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

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
            <Title>{profile?.name ?? session.user.name}</Title>
            <View style={{ height: spacing.xs }} />
            <Body muted>{profile?.email ?? session.user.email}</Body>
            <View style={{ height: spacing.md }} />
            <Badge>{session.session.role}</Badge>
          </Card>
        )}

        {!session.session.profileCompleted ? (
          <Card>
            <Title>Finish your profile</Title>
            <View style={{ height: spacing.sm }} />
            {/* The profile form is long, role-specific and validated against
                schemas the web app already renders. Sending the user there is
                honest; a half-built duplicate would not be. */}
            <Body muted>
              Complete it on the web at {mobileEnv.webOrigin}/dashboard/profile-complete before
              enrolling.
            </Body>
          </Card>
        ) : null}

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
