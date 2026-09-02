/**
 * The numbers behind signing in with a handset, in one place because three
 * layers have to agree on them: the Better Auth plugin that mints and expires
 * the code (`packages/auth/src/phone-otp.ts`), and the web and mobile screens
 * that tell the person how long they have and when they may ask again.
 */

/** Digits in a code. */
export const phoneOtpLength = 6;

/** How long a code stays good. */
export const phoneOtpExpirySeconds = 300;

/** How long one handset must wait between codes. Enforced server-side. */
export const phoneOtpCooldownSeconds = 60;

/** Wrong guesses allowed before the code is burned. */
export const phoneOtpAllowedAttempts = 3;
