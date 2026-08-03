import type { UserRole } from "@genex/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, Stack, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import {
  Body,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  Heading,
  Screen,
  ScreenSkeleton
} from "@/src/components/ui";
import { getOwnProfile, updateOwnProfile } from "@/src/lib/api";
import { profileFormShape, profileFormValues, validateProfileForm } from "@/src/lib/profile-form";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

/**
 * The profile form, native rather than a link to the web.
 *
 * The API refuses most actions until `profileCompleted` is true, so this sits
 * on the critical path for every account created on a phone. Sending the
 * student to a browser would not have worked anyway: the session cookie lives
 * in this app's keychain and is replayed on requests, so a browser opened from
 * here arrives signed out.
 *
 * The fields, the schema and the initial values come from `profile-form.ts`;
 * the API picks which schema to validate against from the session's role, so
 * this screen sends the shape that matches the role it was rendered for.
 */
export default function ProfileCompleteScreen(): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isPending: isSessionPending, session } = useSession();
  const role = (session?.session.role ?? "STUDENT") as UserRole;
  const { data: profile = null, isPending: isProfilePending } = useQuery({
    enabled: Boolean(session),
    queryFn: getOwnProfile,
    queryKey: queryKeys.profile()
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);

  useEffect(() => {
    // Filled once, from whatever the profile already holds. Re-running on every
    // refetch would overwrite what the student is in the middle of typing.
    if (profile !== null && !hasLoadedProfile) {
      setValues(profileFormValues(profile, role));
      setHasLoadedProfile(true);
    }
  }, [hasLoadedProfile, profile, role]);

  const save = useMutation({
    mutationFn: updateOwnProfile,
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
    onSuccess: async () => {
      // The session carries `profileCompleted`, and the shell reads it to
      // decide what the account is allowed to do.
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.session() });
      router.back();
    }
  });

  if (isSessionPending) {
    return <ScreenSkeleton rows={4} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (isProfilePending || !hasLoadedProfile) {
    return <ScreenSkeleton rows={4} />;
  }

  const { fields } = profileFormShape(role);

  const handleSubmit = (): void => {
    setSubmitError(null);

    const result = validateProfileForm(values, role);

    setErrors(result.errors);

    if (result.values !== null) {
      save.mutate(result.values);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Complete your profile" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Heading>Complete your profile</Heading>
          <Body muted>
            Fill this in once. Enrolment and most of the dashboard stay locked until it is done.
          </Body>

          {submitError ? <ErrorNotice message={submitError} /> : null}

          <Card style={styles.form}>
            {fields.map((field) => (
              <View key={field.key}>
                <Field
                  autoCapitalize={field.key === "name" ? "words" : "none"}
                  keyboardType={field.keyboard ?? "default"}
                  label={field.label}
                  multiline={field.multiline ?? false}
                  onChangeText={(text) => {
                    setValues((current) => ({ ...current, [field.key]: text }));
                  }}
                  placeholder={field.placeholder ?? ""}
                  style={field.multiline ? styles.multiline : undefined}
                  value={values[field.key] ?? ""}
                />
                {errors[field.key] ? (
                  <View style={styles.fieldError}>
                    <Caption tone="error">{errors[field.key]}</Caption>
                  </View>
                ) : null}
              </View>
            ))}
          </Card>

          <Button isBusy={save.isPending} label="Save profile" onPress={handleSubmit} />
          <Caption>Only your full name is required. Everything else can wait.</Caption>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  fieldError: { paddingTop: spacing.xs },
  flex: { flex: 1 },
  form: { gap: spacing.lg },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
