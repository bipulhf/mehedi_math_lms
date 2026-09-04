import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { AuthScaffold } from "@/src/components/auth-scaffold";
import { Body, Button, ErrorNotice, Field, Title } from "@/src/components/ui";
import { requestPasswordReset } from "@/src/lib/auth";
import { useT } from "@/src/lib/locale";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * Where the reset link is asked for.
 *
 * The link itself lands on the web app — the mail carries a browser token, and
 * the confirmation deliberately never says whether the address is registered.
 */
export default function ForgotPasswordScreen(): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
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
      <AuthScaffold
        lead={t("auth.resetLinkSentLead", { email: sentTo })}
        onBack={() => router.replace("/sign-in")}
        title={t("auth.resetLinkSent")}
      >
        {/* The mark of a thing that worked. A confirmation with nothing on it
            but two buttons reads as another form to fill in. */}
        <View style={styles.sentMark}>
          <Ionicons color={colors.tint.mint.fg} name="mail-open" size={30} />
        </View>
        <Title>{t("auth.resetLinkSent")}</Title>
        <Body muted>{t("auth.resetLinkSentLead", { email: sentTo })}</Body>
        <Button
          label={t("auth.signIn")}
          onPress={() => router.replace("/sign-in")}
          size="lg"
          stretch
        />
        <Button
          label={t("auth.sendToAnotherEmail")}
          onPress={() => {
            setEmail("");
            setSentTo(null);
          }}
          stretch
          variant="outline"
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      footer={
        <>
          <Body muted>{t("auth.haveAccount")}</Body>
          <Pressable
            accessibilityRole="link"
            hitSlop={spacing.sm}
            onPress={() => router.replace("/sign-in")}
          >
            <Text style={styles.footerLink}>{t("auth.signIn")}</Text>
          </Pressable>
        </>
      }
      lead={t("auth.forgotPasswordLead")}
      onBack={() => router.replace("/sign-in")}
      title={t("auth.forgotPasswordTitle")}
    >
      <Field
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label={t("auth.email")}
        onChangeText={setEmail}
        onSubmitEditing={() => {
          if (email.trim().length > 0) {
            send.mutate();
          }
        }}
        placeholder="you@example.com"
        returnKeyType="go"
        value={email}
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Button
        disabled={email.trim().length === 0}
        isBusy={send.isPending}
        label={send.isPending ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
        onPress={() => send.mutate()}
        size="lg"
        stretch
      />
    </AuthScaffold>
  );
}

const useStyles = makeStyles((colors) => ({
  footerLink: { color: colors.accent, fontFamily: fonts.displaySemiBold, fontSize: 16 },
  sentMark: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.tint.mint.bg,
    borderRadius: radius.tile,
    height: 64,
    justifyContent: "center",
    width: 64
  }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
