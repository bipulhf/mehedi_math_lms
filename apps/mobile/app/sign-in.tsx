import { Link, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";

import { AuthScaffold, OrDivider } from "@/src/components/auth-scaffold";
import { GoogleSignInButton } from "@/src/components/google-sign-in-button";
import { PhoneOtpForm } from "@/src/components/phone-otp-form";
import { Body, Button, ErrorNotice, Field } from "@/src/components/ui";
import { Tabs } from "@/src/components/ui-display";
import { useT } from "@/src/lib/locale";
import { useSignIn } from "@/src/lib/use-session";
import { fonts, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

type SignInMethod = "email" | "phone";

export default function SignInScreen(): JSX.Element {
  const styles = useStyles();
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
    <AuthScaffold
      footer={
        <>
          <Body muted>{t("auth.newHere")}</Body>
          <Link asChild href="/sign-up">
            <Pressable accessibilityRole="link" hitSlop={spacing.sm}>
              <Text style={styles.footerLink}>{t("auth.signUp")}</Text>
            </Pressable>
          </Link>
        </>
      }
      lead={t("auth.signInLead")}
      title={t("auth.welcomeBack")}
    >
      <Tabs
        inset={false}
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
            returnKeyType="next"
            value={email}
          />
          <Field
            autoCapitalize="none"
            autoComplete="current-password"
            label={t("auth.password")}
            onChangeText={setPassword}
            onSubmitEditing={() => {
              if (canSubmit) {
                handleSubmit();
              }
            }}
            placeholder={t("auth.passwordPlaceholder")}
            returnKeyType="go"
            secureTextEntry
            value={password}
          />

          {error ? <ErrorNotice message={error} /> : null}

          <Button
            disabled={!canSubmit}
            isBusy={signIn.isPending}
            label={t("auth.signIn")}
            onPress={handleSubmit}
            size="lg"
            stretch
          />

          {/* Right-aligned and quiet: the way out of a problem, not one of the
              two things this screen is for. */}
          <View style={styles.forgotRow}>
            <Button
              label={t("auth.forgotPassword")}
              onPress={() => router.push("/forgot-password")}
              size="sm"
              variant="accentLink"
            />
          </View>
        </>
      )}

      <OrDivider label={t("common.or")} />

      <GoogleSignInButton />
    </AuthScaffold>
  );
}

const useStyles = makeStyles((colors) => ({
  footerLink: { color: colors.accent, fontFamily: fonts.displaySemiBold, fontSize: 16 },
  forgotRow: { alignItems: "flex-end" }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
