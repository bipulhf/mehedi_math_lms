import { Link, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { GoogleSignInButton } from "@/src/components/google-sign-in-button";
import { Body, Button, Card, Field, Heading, Screen, Title } from "@/src/components/ui";
import { useSignIn } from "@/src/lib/use-session";
import { colors, spacing } from "@/src/theme/tokens";

export default function SignInScreen(): JSX.Element {
  const router = useRouter();
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
          <Heading>Welcome back</Heading>
          <Body muted>Sign in to reach your courses, tests and messages.</Body>

          <Card>
            <View style={styles.form}>
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
                autoComplete="current-password"
                label="Password"
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                value={password}
              />

              {error ? <Body>{error}</Body> : null}

              <Button
                disabled={!canSubmit}
                isBusy={signIn.isPending}
                label="Sign in"
                onPress={handleSubmit}
              />

              <GoogleSignInButton />
            </View>
          </Card>

          <Card>
            <Title>New here?</Title>
            <View style={{ height: spacing.sm }} />
            <Body muted>Student accounts can be created from the app.</Body>
            <View style={{ height: spacing.lg }} />
            <Link asChild href="/sign-up">
              <Button label="Create a student account" onPress={() => undefined} variant="outline" />
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
