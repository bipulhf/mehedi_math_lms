import type { JSX } from "react";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  normalizeBdPhoneE164,
  phoneOtpCooldownSeconds,
  phoneOtpExpirySeconds,
  phoneOtpLength
} from "@mma/shared";

import { Button, Caption, ErrorNotice, Field } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { useSendPhoneOtp, useVerifyPhoneOtp } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

export interface PhoneOtpFormProps {
  onSignedIn: () => void;
}

/**
 * Signing in with a handset, which is also how an account is made: an unknown
 * number becomes one when the code checks out. Sign-in and sign-up therefore
 * show the same form, and neither asks for a password.
 *
 * The number is put into its canonical `8801XXXXXXXXX` form here, before it is
 * sent — the server takes that string as the account key and refuses anything
 * else, so two spellings can never become two accounts.
 */
export function PhoneOtpForm({ onSignedIn }: PhoneOtpFormProps): JSX.Element {
  const t = useT();
  const sendOtp = useSendPhoneOtp();
  const verifyOtp = useVerifyPhoneOtp();
  const [phoneInput, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  useEffect(() => {
    if (secondsUntilResend <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setSecondsUntilResend((seconds) => seconds - 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [secondsUntilResend]);

  const requestCode = (phoneE164: string): void => {
    setError(null);
    sendOtp.mutate(phoneE164, {
      onError: (mutationError) => {
        setError(mutationError.message);
      },
      onSuccess: () => {
        setCode("");
        setSentTo(phoneE164);
        // Matches the server's per-handset cooldown, so the button returns at
        // the moment another code would actually be accepted.
        setSecondsUntilResend(phoneOtpCooldownSeconds);
      }
    });
  };

  const handleSendPress = (): void => {
    const phoneE164 = normalizeBdPhoneE164(phoneInput);

    if (!phoneE164) {
      setError(t("auth.phoneInvalid"));

      return;
    }

    requestCode(phoneE164);
  };

  const handleVerifyPress = (): void => {
    if (sentTo === null) {
      return;
    }

    setError(null);
    verifyOtp.mutate(
      { code: code.trim(), phoneE164: sentTo },
      {
        onError: (mutationError) => {
          setError(mutationError.message);
        },
        onSuccess: onSignedIn
      }
    );
  };

  if (sentTo === null) {
    return (
      <View style={styles.form}>
        <Field
          autoComplete="tel"
          keyboardType="phone-pad"
          label={t("auth.phone")}
          onChangeText={setPhoneInput}
          placeholder={t("auth.phonePlaceholder")}
          value={phoneInput}
        />
        <Caption>{t("auth.phoneLead")}</Caption>

        {error ? <ErrorNotice message={error} /> : null}

        <Button
          disabled={phoneInput.trim().length === 0}
          isBusy={sendOtp.isPending}
          label={t("auth.sendCode")}
          onPress={handleSendPress}
          size="lg"
          stretch
        />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Field
        autoComplete="sms-otp"
        keyboardType="number-pad"
        label={t("auth.otp")}
        maxLength={phoneOtpLength}
        onChangeText={(next) => {
          setCode(next.replace(/\D/g, ""));
        }}
        placeholder={t("auth.otpPlaceholder", { length: phoneOtpLength })}
        value={code}
      />
      <Caption>
        {t("auth.codeSentTo", { length: phoneOtpLength, phone: sentTo })}{" "}
        {t("auth.codeExpiresIn", { minutes: phoneOtpExpirySeconds / 60 })}
      </Caption>

      {error ? <ErrorNotice message={error} /> : null}

      <Button
        disabled={code.length < phoneOtpLength}
        isBusy={verifyOtp.isPending}
        label={t("auth.verifyCode")}
        onPress={handleVerifyPress}
        size="lg"
        stretch
      />

      {secondsUntilResend > 0 ? (
        <Caption>{t("auth.resendCodeIn", { seconds: secondsUntilResend })}</Caption>
      ) : (
        <Button
          isBusy={sendOtp.isPending}
          label={t("auth.resendCode")}
          onPress={() => {
            requestCode(sentTo);
          }}
          variant="accentLink"
        />
      )}

      <Button
        label={t("auth.changePhone")}
        onPress={() => {
          setSentTo(null);
          setError(null);
        }}
        variant="ghost"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg }
});
