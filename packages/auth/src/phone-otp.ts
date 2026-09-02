import { APIError, createAuthMiddleware } from "better-auth/api";
import type { AuthMiddleware } from "better-auth/api";
import { phoneNumber } from "better-auth/plugins";
import { and, db, eq, gt, verificationTokens } from "@genex/db";
import {
  appDomain,
  appName,
  normalizeBdPhoneE164,
  phoneOtpAllowedAttempts,
  phoneOtpCooldownSeconds,
  phoneOtpExpirySeconds,
  phoneOtpLength
} from "@genex/shared";
import { sendSms, smsEnv } from "@genex/sms";

/**
 * Signing in with a handset instead of an inbox.
 *
 * One flow covers both halves of what a person calls "login" and "register":
 * `/phone-number/send-otp`, then `/phone-number/verify`. If the number is
 * already on an account the code signs that person in; if it is not,
 * `signUpOnVerification` makes the account there and then. There is no
 * separate registration endpoint and no password anywhere on this path --
 * possession of the handset is the whole proof.
 *
 * A new account lands with `profileCompleted: false` and its phone number as
 * its name, which drops it into the existing profile wizard where the real
 * name is asked for. That is deliberate: the alternative is a second
 * onboarding path that has to be kept in step with the first.
 *
 * `server.ts` and `tanstack-server.ts` both build their plugin from this one
 * factory. They are otherwise hand-synced duplicates (see AGENTS.md), and a
 * phone plugin that disagreed between them would mean the API reading a
 * session shape the web app does not produce.
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * The address a phone-only account is created under. `users.email` is
 * `NOT NULL` and unique, so the row needs something there; this is that
 * something. It is never routable and nothing ever mails it -- a person who
 * signed up with a handset recovers with another code, not a reset link.
 */
function tempEmailFor(phoneE164: string): string {
  return `${phoneE164}@phone.${appDomain}`;
}

function otpMessage(code: string): string {
  // Plain ASCII on purpose. A Bangla body is sent as UCS-2, which cuts the
  // segment from 160 characters to 70 and doubles what the operator charges
  // for a message nobody reads for its prose.
  return `${code} is your ${appName} verification code. It expires in ${String(
    phoneOtpExpirySeconds / 60
  )} minutes. Do not share it.`;
}

export function createPhoneOtpPlugin(): ReturnType<typeof phoneNumber> {
  return phoneNumber({
    allowedAttempts: phoneOtpAllowedAttempts,
    expiresIn: phoneOtpExpirySeconds,
    otpLength: phoneOtpLength,
    /**
     * The submitted string is the account key and the verification identifier
     * -- the plugin stores it verbatim. So this demands the canonical form
     * rather than accepting anything it could normalize: if `01712345678` and
     * `+8801712345678` both got through, one person would end up with two
     * accounts. Every client normalizes with `normalizeBdPhoneE164` before it
     * calls, and this is the check that they did.
     */
    phoneNumberValidator: (raw: string) => normalizeBdPhoneE164(raw) === raw,
    // Only bears on `/sign-in/phone-number`, the password path we do not use.
    // On: a number backfilled from a profile has never been proven, and must
    // not become a way into the account until a code has landed on it.
    requireVerification: true,
    sendOTP: async ({ code, phoneNumber: to }) => {
      // No credentials on a developer's machine, and nobody local owns the
      // number anyway. Print it instead of failing, strictly in development --
      // `NODE_ENV` is `production` on every deployed host, so this branch
      // cannot put a live code into a real log.
      if (isDevelopment && !smsEnv.isSmsConfigured) {
        console.info(`[phone-otp] ${to}: ${code}`);

        return;
      }

      await sendSms({ phoneE164: to, text: otpMessage(code) });
    },
    signUpOnVerification: {
      getTempEmail: tempEmailFor,
      getTempName: (phone: string) => phone
    }
  });
}

/**
 * A cooldown per handset, which the built-in rate limiter cannot give.
 *
 * Better Auth counts requests per IP and path; a script rotating IPs against
 * one number would pass that and still ring somebody's phone every second, at
 * our cost per message. This counts against the number instead.
 *
 * It runs before the endpoint, which matters: the plugin writes the
 * verification row and *then* calls `sendOTP`, so a check inside `sendOTP`
 * would already have paid for the row and could only answer with a 500.
 */
export const phoneOtpCooldownHook: AuthMiddleware = createAuthMiddleware(async (context) => {
  if (context.path !== "/phone-number/send-otp") {
    return;
  }

  const body = context.body as { phoneNumber?: unknown } | undefined;
  const to = body?.phoneNumber;

  if (typeof to !== "string" || to.length === 0) {
    return;
  }

  const sentSince = new Date(Date.now() - phoneOtpCooldownSeconds * 1000);
  const recent = await db
    .select({ id: verificationTokens.id })
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, to), gt(verificationTokens.createdAt, sentSince)))
    .limit(1);

  if (recent.length > 0) {
    throw new APIError("TOO_MANY_REQUESTS", {
      code: "PHONE_OTP_COOLDOWN",
      message: `A code was already sent. Wait ${String(phoneOtpCooldownSeconds)} seconds before asking for another.`
    });
  }
});
