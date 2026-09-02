import type { UserRole } from "@mma/shared";
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
import { Avatar } from "@/src/components/ui-display";
import { getOwnProfile, updateOwnProfile } from "@/src/lib/api/profiles";
import { pickAndUploadImage } from "@/src/lib/image-upload";
import { useT } from "@/src/lib/locale";
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
  const t = useT();
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Filled once, from whatever the profile already holds. Re-running on every
    // refetch would overwrite what the student is in the middle of typing.
    if (profile !== null && !hasLoadedProfile) {
      setValues(profileFormValues(profile, role));
      setPhotoUrl(
        profile.user.image ??
          profile.studentProfile?.profilePhoto ??
          profile.teacherProfile?.profilePhoto ??
          null
      );
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
  const uploadPhoto = useMutation({
    mutationFn: () =>
      pickAndUploadImage({ aspect: [1, 1], maxWidth: 1200, purpose: "PROFILE_PHOTO" }),
    onError: (error: Error) => setSubmitError(error.message),
    onSuccess: (url) => {
      if (url !== null) {
        setPhotoUrl(url);
        setSubmitError(null);
      }
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
      save.mutate(
        role === "STUDENT" || role === "TEACHER"
          ? { ...result.values, profilePhoto: photoUrl ?? "" }
          : result.values
      );
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t("profc.title") }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Heading>{t("profc.title")}</Heading>
          <Body muted>{t("profile.completeLead")}</Body>

          {submitError ? <ErrorNotice message={submitError} /> : null}

          {role === "STUDENT" || role === "TEACHER" ? (
            <Card style={styles.photoCard}>
              <Avatar name={values.name ?? session.user.name} photo={photoUrl} size={96} />
              <View style={styles.photoText}>
                <Body>{t("profile.photo")}</Body>
                <Caption>{t("profile.photoLead")}</Caption>
                <Button
                  isBusy={uploadPhoto.isPending}
                  label={t("profile.choosePhoto")}
                  onPress={() => {
                    setSubmitError(null);
                    uploadPhoto.mutate();
                  }}
                  size="sm"
                  variant="outline"
                />
              </View>
            </Card>
          ) : null}

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

          <Button isBusy={save.isPending} label={t("action.save")} onPress={handleSubmit} />
          <Caption>{t("profile.completeFormLead")}</Caption>
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
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" },
  photoCard: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  photoText: { flex: 1, gap: spacing.xs }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
