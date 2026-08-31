import { useMutation } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import {
  Body,
  Button,
  Card,
  ErrorNotice,
  Field,
  Heading,
  Screen,
  Title
} from "@/src/components/ui";
import { requestPasswordReset } from "@/src/lib/auth";
import { useT } from "@/src/lib/locale";
import { colors, spacing } from "@/src/theme/tokens";

/**
 * Where the reset link is asked for.
 *
 * The link itself lands on the web app — the mail carries a browser token, and
 * the confirmation deliberately never says whether the address is registered.
 */
export default function ForgotPasswordScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: async () => requestPasswordReset(email.trim()),
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: () => {
      setError(null);
      setSentTo(email.trim());
    }
  });

  if (sentTo !== null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t("auth.forgotPasswordTitle") }} />
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={{ gap: spacing.sm }}>
            <Title>{t("auth.resetLinkSent")}</Title>
            <Body muted>{t("auth.resetLinkSentLead", { email: sentTo })}</Body>
          </Card>
          <Button
            label={t("auth.sendToAnotherEmail")}
            onPress={() => {
              setEmail("");
              setSentTo(null);
            }}
            variant="outline"
          />
          <Button label={t("auth.signIn")} onPress={() => router.replace("/sign-in")} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("auth.forgotPasswordTitle") }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Heading>{t("auth.forgotPasswordTitle")}</Heading>
          <Body muted>{t("auth.forgotPasswordLead")}</Body>

          <Card>
            <View style={styles.form}>
              <Field
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label={t("auth.email")}
                onChangeText={setEmail}
                placeholder="you@example.com"
                value={email}
              />

              {error ? <ErrorNotice message={error} /> : null}

              <Button
                disabled={email.trim().length === 0}
                isBusy={send.isPending}
                label={send.isPending ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
                onPress={() => send.mutate()}
              />
            </View>
          </Card>

          <Button
            label={t("auth.signIn")}
            onPress={() => router.replace("/sign-in")}
            variant="ghost"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  flex: { backgroundColor: colors.background, flex: 1 },
  form: { gap: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
