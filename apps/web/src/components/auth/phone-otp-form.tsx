import { useRouter } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";
import {
  normalizeBdPhoneE164,
  phoneOtpCooldownSeconds,
  phoneOtpExpirySeconds,
  phoneOtpLength
} from "@mma/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth";
import { useT } from "@/lib/i18n/locale-context";

export interface PhoneOtpFormProps {
  courseSlug?: string | undefined;
}

/**
 * Signing in with a handset. The same form is both halves of the pair: if the
 * number is on an account the code signs that person in, and if it is not the
 * account is made when the code checks out. So sign-in and sign-up show the
 * identical component and neither asks for a password.
 *
 * The number is put into its canonical `8801XXXXXXXXX` form here, before it is
 * ever sent. The server takes that string as the account key and refuses
 * anything that is not already canonical — two spellings getting through would
 * be one person with two accounts.
 */
export function PhoneOtpForm({ courseSlug }: PhoneOtpFormProps): JSX.Element {
  const router = useRouter();
  const t = useT();
  const [phoneInput, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const sendCode = async (phoneE164: string): Promise<void> => {
    setIsSubmitting(true);

    try {
      const response = await authClient.phoneNumber.sendOtp({ phoneNumber: phoneE164 });

      if (response.error) {
        setError(response.error.message ?? null);

        return;
      }

      setError(null);
      setCode("");
      setSentTo(phoneE164);
      // Matches the server's per-handset cooldown, so the button comes back at
      // the moment another code would actually be accepted.
      setSecondsUntilResend(phoneOtpCooldownSeconds);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const phoneE164 = normalizeBdPhoneE164(phoneInput);

    if (!phoneE164) {
      setError(t("auth.phoneInvalid"));

      return;
    }

    await sendCode(phoneE164);
  };

  const handleCodeSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (sentTo === null) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authClient.phoneNumber.verify({
        code: code.trim(),
        phoneNumber: sentTo
      });

      if (response.error) {
        setError(response.error.message ?? null);

        return;
      }

      // `/dashboard` sends a half-finished profile on to the wizard by itself
      // (routes/dashboard.tsx), so a brand-new account needs no special case
      // here. The exception is somebody who came from a course page: that slug
      // has to be carried, and only the wizard route takes it.
      if (courseSlug) {
        await router.navigate({ search: { courseSlug }, to: "/dashboard/profile-complete" });

        return;
      }

      await router.navigate({ to: "/dashboard" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sentTo === null) {
    return (
      <form className="space-y-5" onSubmit={handlePhoneSubmit}>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("auth.phone")}</Label>
          <Input
            autoComplete="tel"
            error={error ?? undefined}
            id="phone"
            inputMode="tel"
            onChange={(event) => {
              setPhoneInput(event.target.value);
            }}
            placeholder={t("auth.phonePlaceholder")}
            type="tel"
            value={phoneInput}
          />
          <p className="text-sm font-light text-muted">{t("auth.phoneLead")}</p>
        </div>
        <Button
          className="w-full"
          disabled={isSubmitting || phoneInput.trim().length === 0}
          size="lg"
          type="submit"
        >
          {isSubmitting ? t("auth.sendingCode") : t("auth.sendCode")}
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleCodeSubmit}>
      <div className="space-y-2">
        <Label htmlFor="otp">{t("auth.otp")}</Label>
        <Input
          autoComplete="one-time-code"
          error={error ?? undefined}
          id="otp"
          inputMode="numeric"
          maxLength={phoneOtpLength}
          onChange={(event) => {
            setCode(event.target.value.replaceAll(/\D/g, ""));
          }}
          placeholder={t("auth.otpPlaceholder", { length: phoneOtpLength })}
          value={code}
        />
        <p className="text-sm font-light leading-relaxed text-muted">
          {t("auth.codeSentTo", { length: phoneOtpLength, phone: sentTo })}{" "}
          {t("auth.codeExpiresIn", { minutes: phoneOtpExpirySeconds / 60 })}
        </p>
      </div>

      <Button
        className="w-full"
        disabled={isSubmitting || code.length < phoneOtpLength}
        size="lg"
        type="submit"
      >
        {isSubmitting ? t("auth.verifyingCode") : t("auth.verifyCode")}
      </Button>

      <div className="flex items-center justify-between gap-3">
        <Button
          onClick={() => {
            setSentTo(null);
            setError(null);
          }}
          size="sm"
          type="button"
          variant="accentLink"
        >
          {t("auth.changePhone")}
        </Button>

        {secondsUntilResend > 0 ? (
          <span className="text-sm font-light text-muted">
            {t("auth.resendCodeIn", { seconds: secondsUntilResend })}
          </span>
        ) : (
          <Button
            disabled={isSubmitting}
            onClick={async () => {
              await sendCode(sentTo);
            }}
            size="sm"
            type="button"
            variant="accentLink"
          >
            {t("auth.resendCode")}
          </Button>
        )}
      </div>
    </form>
  );
}
