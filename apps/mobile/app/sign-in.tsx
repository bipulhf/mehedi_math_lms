import { Link, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";

import { GoogleSignInButton } from "@/src/components/google-sign-in-button";
import { PhoneOtpForm } from "@/src/components/phone-otp-form";
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
import { Tabs } from "@/src/components/ui-display";
import { useT } from "@/src/lib/locale";
import { useSignIn } from "@/src/lib/use-session";
import { colors, spacing } from "@/src/theme/tokens";

type SignInMethod = "email" | "phone";

export default function SignInScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const signIn = useSignIn();
  // Phone first: it is the way most of this audience has an account at all,
  // and it needs no password to have been remembered.
  const [method, setMethod] = useState<SignInMethod>("phone");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  // Explore is the public storefront a visitor came from, or would have,
  // so back always lands there — not an app exit, and not stuck on sign-in
  // for someone who followed a deep link straight to it.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/explore");
      return true;
    });

    return () => subscription.remove();
  }, [router]);

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

                  {error ? <ErrorNotice message={error} /> : null}

                  <Button
                    disabled={!canSubmit}
                    isBusy={signIn.isPending}
                    label={t("auth.signIn")}
                    onPress={handleSubmit}
                  />

                  <Button
                    label={t("auth.forgotPassword")}
                    onPress={() => router.push("/forgot-password")}
                    variant="ghost"
                  />
                </>
              )}
            </View>
          </Card>

          <Card>
            <Title>{t("auth.newHere")}</Title>
            <View style={{ height: spacing.sm }} />
            <Body muted>{t("auth.signUpLead")}</Body>
            <View style={{ height: spacing.lg }} />
            <Link asChild href="/sign-up">
              <Button label={t("auth.signUp")} onPress={() => undefined} variant="outline" />
            </Link>
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
