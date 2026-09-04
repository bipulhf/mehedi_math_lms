import { Link, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, Text } from "react-native";

import { AuthScaffold, OrDivider } from "@/src/components/auth-scaffold";
import { GoogleSignInButton } from "@/src/components/google-sign-in-button";
import { PhoneOtpForm } from "@/src/components/phone-otp-form";
import { Body, Button, Caption, ErrorNotice, Field } from "@/src/components/ui";
import { Tabs } from "@/src/components/ui-display";
import { useT } from "@/src/lib/locale";
import { useSignUp } from "@/src/lib/use-session";
import { fonts, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

const MINIMUM_PASSWORD_LENGTH = 8;

type SignUpMethod = "email" | "phone";

export default function SignUpScreen(): JSX.Element {
  const styles = useStyles();
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
    <AuthScaffold
      footer={
        <>
          <Body muted>{t("auth.haveAccount")}</Body>
          <Link asChild href="/sign-in">
            <Pressable accessibilityRole="link" hitSlop={spacing.sm}>
              <Text style={styles.footerLink}>{t("auth.signIn")}</Text>
            </Pressable>
          </Link>
        </>
      }
      lead={t("auth.signUpLead")}
      title={t("auth.signUp")}
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
            autoComplete="name"
            label={t("auth.name")}
            onChangeText={setName}
            placeholder={t("auth.namePlaceholder")}
            returnKeyType="next"
            value={name}
          />
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
            autoComplete="new-password"
            label={t("auth.password")}
            onChangeText={setPassword}
            onSubmitEditing={() => {
              if (canSubmit) {
                handleSubmit();
              }
            }}
            placeholder={t("password.placeholderNew", { count: MINIMUM_PASSWORD_LENGTH })}
            returnKeyType="go"
            secureTextEntry
            value={password}
          />

          {/* The rule, shown only once it is being broken. */}
          {passwordTooShort ? (
            <Caption tone="error">
              {t("auth.passwordMinLength", { count: MINIMUM_PASSWORD_LENGTH })}
            </Caption>
          ) : null}
          {error ? <ErrorNotice message={error} /> : null}

          <Button
            disabled={!canSubmit}
            isBusy={signUp.isPending}
            label={t("auth.signUp")}
            onPress={handleSubmit}
            size="lg"
            stretch
          />
        </>
      )}

      <OrDivider label={t("common.or")} />

      <GoogleSignInButton allowSignUp />
    </AuthScaffold>
  );
}

const useStyles = makeStyles((colors) => ({
  footerLink: { color: colors.accent, fontFamily: fonts.displaySemiBold, fontSize: 16 }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
