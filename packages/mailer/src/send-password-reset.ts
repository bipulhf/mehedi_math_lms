import { defaultLocale, isLocale, localeCookieName, type Locale } from "@mma/i18n";

import { sendMail } from "./mailer";
import { renderPasswordResetEmail } from "./templates/password-reset";

/**
 * How long a reset link lives. Also written into the mail, so the two can never
 * disagree, and passed to Better Auth as `resetPasswordTokenExpiresIn`.
 */
export const passwordResetExpirySeconds = 60 * 60;

/**
 * The language the mail is written in.
 *
 * Taken from the locale cookie on the request that asked for the reset — the
 * same cookie that decided which language the form was in — because a reader
 * who just filled in a Bangla page should not get an English mail. No cookie
 * (a request from the mobile app, a curl) means Bangla, the product's default.
 */
export function localeFromRequest(request: Request | undefined): Locale {
  const header = request?.headers.get("cookie");

  if (!header) {
    return defaultLocale;
  }

  for (const entry of header.split(";")) {
    const [name, ...rest] = entry.trim().split("=");

    if (name === localeCookieName) {
      const value = decodeURIComponent(rest.join("="));

      return isLocale(value) ? value : defaultLocale;
    }
  }

  return defaultLocale;
}

export interface SendPasswordResetEmailInput {
  email: string;
  name: string;
  request?: Request | undefined;
  resetUrl: string;
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
  const { html, subject, text } = renderPasswordResetEmail({
    expiryMinutes: passwordResetExpirySeconds / 60,
    locale: localeFromRequest(input.request),
    name: input.name,
    resetUrl: input.resetUrl
  });

  await sendMail({ html, subject, text, to: input.email });
}
