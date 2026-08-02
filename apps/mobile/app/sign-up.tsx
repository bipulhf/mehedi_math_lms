import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { GoogleSignInButton } from "@/src/components/google-sign-in-button";
import { Body, Button, Card, Field, Heading, Screen } from "@/src/components/ui";
import { useSignUp } from "@/src/lib/use-session";
import { colors, spacing } from "@/src/theme/tokens";

const MINIMUM_PASSWORD_LENGTH = 8;

export default function SignUpScreen(): JSX.Element {
  const router = useRouter();
  const signUp = useSignUp();
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
          <Heading>Create your account</Heading>
          <Body muted>
            Sign-up here creates a student account. Teacher and staff accounts are created by an
            administrator.
          </Body>

          <Card>
            <View style={styles.form}>
              <Field
                autoComplete="name"
                label="Full name"
                onChangeText={setName}
                placeholder="Your name"
                value={name}
              />
              <Field
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Email"
                onChangeText={setEmail}
                placeholder="you@example.com"
                value={email}
              />
              <Field
                autoCapitalize="none"
                autoComplete="new-password"
                label="Password"
                onChangeText={setPassword}
                placeholder={`At least ${MINIMUM_PASSWORD_LENGTH} characters`}
                secureTextEntry
                value={password}
              />

              {passwordTooShort ? (
                <Body muted>Passwords must be at least {MINIMUM_PASSWORD_LENGTH} characters.</Body>
              ) : null}
              {error ? <Body>{error}</Body> : null}

              <Button
                disabled={!canSubmit}
                isBusy={signUp.isPending}
                label="Create account"
                onPress={handleSubmit}
              />

              <GoogleSignInButton />
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
