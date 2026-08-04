import { useMutation } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import {
  Badge,
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
import { changePassword } from "@/src/lib/auth";
import { useT } from "@/src/lib/locale";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

const PASSWORD_FLOOR = 8;

export default function ChangePasswordScreen(): JSX.Element {
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasChanged, setHasChanged] = useState(false);

  const submit = useMutation({
    mutationFn: changePassword,
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasChanged(true);
    }
  });

  if (isSessionPending) {
    return <ScreenSkeleton rows={2} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= PASSWORD_FLOOR &&
    passwordsMatch &&
    newPassword !== currentPassword;

  return (
    <Screen>
      <Stack.Screen options={{ title: t("password.title") }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Heading>{t("password.title")}</Heading>
          <Body muted>{t("password.lead", { count: PASSWORD_FLOOR })}</Body>

          {error ? <ErrorNotice message={error} /> : null}
          {hasChanged ? <Badge tone="faded">{t("password.changed")}</Badge> : null}

          <Card style={styles.form}>
            <Field
              autoCapitalize="none"
              label={t("password.current")}
              onChangeText={(text) => {
                setCurrentPassword(text);
                setHasChanged(false);
              }}
              placeholder={t("password.placeholderCurrent")}
              secureTextEntry
              value={currentPassword}
            />
            <Field
              autoCapitalize="none"
              label={t("password.new")}
              onChangeText={(text) => {
                setNewPassword(text);
                setHasChanged(false);
              }}
              placeholder={t("password.placeholderNew", { count: PASSWORD_FLOOR })}
              secureTextEntry
              value={newPassword}
            />
            <View>
              <Field
                autoCapitalize="none"
                label={t("password.confirm")}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setHasChanged(false);
                }}
                placeholder={t("password.placeholderConfirm")}
                secureTextEntry
                value={confirmPassword}
              />
              {confirmPassword.length > 0 && !passwordsMatch ? (
                <View style={styles.hint}>
                  <Caption tone="error">{t("password.mismatch")}</Caption>
                </View>
              ) : null}
            </View>
          </Card>

          <Button
            disabled={!canSubmit}
            isBusy={submit.isPending}
            label={t("password.update")}
            onPress={() => {
              setError(null);
              submit.mutate({ currentPassword, newPassword });
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  flex: { flex: 1 },
  form: { gap: spacing.lg },
  hint: { paddingTop: spacing.xs }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
