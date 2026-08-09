import { Link, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { GoogleSignInButton } from "@/src/components/google-sign-in-button";
import { Body, Button, Caption, Card, Field, Heading, Screen, Title } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { useSignIn } from "@/src/lib/use-session";
import { colors, spacing } from "@/src/theme/tokens";

export default function SignInScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleSubmit = (): void => {
    setError(null);
    signIn.mutate(
      { email: email.trim(), password },
      {
        onError: (mutationError) => {
          setError(mutationError.message);
        },
        onSuccess: () => {
          router.replace("/");
        }
      }
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Heading>{t("auth.welcomeBack")}</Heading>
          <Body muted>{t("auth.signInLead")}</Body>

          <Card>
            <View style={styles.form}>
              <GoogleSignInButton />

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Caption>{t("auth.orEmail")}</Caption>
                <View style={styles.dividerLine} />
              </View>

              <Field
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label={t("auth.email")}
                onChangeText={setEmail}
                placeholder="you@example.com"
                value={email}
              />
              <Field
                autoCapitalize="none"
                autoComplete="current-password"
                label={t("auth.password")}
                onChangeText={setPassword}
                placeholder={t("auth.passwordPlaceholder")}
                secureTextEntry
                value={password}
              />

              {error ? <Body>{error}</Body> : null}

              <Button
                disabled={!canSubmit}
                isBusy={signIn.isPending}
                label={t("auth.signIn")}
                onPress={handleSubmit}
              />
            </View>
          </Card>

          <Card>
            <Title>{t("auth.newHere")}</Title>
            <View style={{ height: spacing.sm }} />
            <Body muted>{t("auth.signUpLead")}</Body>
            <View style={{ height: spacing.lg }} />
            <Link asChild href="/sign-up">
              <Button
                label={t("auth.signUp")}
                onPress={() => undefined}
                variant="outline"
              />
            </Link>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  dividerLine: { backgroundColor: colors.hairline, flex: 1, height: 1 },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  flex: { backgroundColor: colors.background, flex: 1 },
  form: { gap: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
