import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { GoogleSignInButton } from "@/src/components/google-sign-in-button";
import { PhoneOtpForm } from "@/src/components/phone-otp-form";
import { Body, Button, Card, ErrorNotice, Field, Heading, Screen } from "@/src/components/ui";
import { Tabs } from "@/src/components/ui-display";
import { useT } from "@/src/lib/locale";
import { useSignUp } from "@/src/lib/use-session";
import { colors, spacing } from "@/src/theme/tokens";

const MINIMUM_PASSWORD_LENGTH = 8;

type SignUpMethod = "email" | "phone";

export default function SignUpScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const signUp = useSignUp();
  // Phone first, as on sign-in: a code on a handset is fewer things to
  // remember than an address and a password.
  const [method, setMethod] = useState<SignUpMethod>("phone");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const passwordTooShort = password.length > 0 && password.length < MINIMUM_PASSWORD_LENGTH;
  const canSubmit =
    name.trim().length > 1 &&
    email.trim().includes("@") &&
    password.length >= MINIMUM_PASSWORD_LENGTH;

  const handleSubmit = (): void => {
    setError(null);
    signUp.mutate(
      { email: email.trim(), name: name.trim(), password },
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
          <Heading>{t("auth.signUp")}</Heading>
          <Body muted>{t("auth.signUpLead")}</Body>

          <Card>
            <View style={styles.form}>
              <GoogleSignInButton allowSignUp />

              <Tabs
                label={t("auth.chooseMethod")}
                onChange={setMethod}
                tabs={[
                  { isActive: method === "phone", label: t("auth.withPhone"), value: "phone" },
                  { isActive: method === "email", label: t("auth.withEmail"), value: "email" }
                ]}
                value={method}
              />

              {method === "phone" ? (
                <PhoneOtpForm
                  onSignedIn={() => {
                    router.replace("/");
                  }}
                />
              ) : (
                <>
                  <Field
                    autoComplete="name"
                    label={t("auth.name")}
                    onChangeText={setName}
                    placeholder={t("auth.namePlaceholder")}
                    value={name}
                  />
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
                    autoComplete="new-password"
                    label={t("auth.password")}
                    onChangeText={setPassword}
                    placeholder={t("password.placeholderNew", { count: MINIMUM_PASSWORD_LENGTH })}
                    secureTextEntry
                    value={password}
                  />

                  {passwordTooShort ? (
                    <Body muted>
                      {t("auth.passwordMinLength", { count: MINIMUM_PASSWORD_LENGTH })}
                    </Body>
                  ) : null}
                  {error ? <ErrorNotice message={error} /> : null}

                  <Button
                    disabled={!canSubmit}
                    isBusy={signUp.isPending}
                    label={t("auth.signUp")}
                    onPress={handleSubmit}
                  />
                </>
              )}
            </View>
          </Card>
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
