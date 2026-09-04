import type { UserRole } from "@mma/shared";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { deviceIdHeader, devicePlatformHeader } from "@mma/shared";

import { REQUEST_TIMEOUT_MS } from "@/src/lib/api-client";
import { claimSessionDevice } from "@/src/lib/api/devices";
import { readDeviceId, readDevicePlatform } from "@/src/lib/device-id";
import { mobileEnv } from "@/src/lib/env";
import {
  clearSessionCookie,
  extractCookiePairs,
  readSessionCookie,
  writeSessionCookie
} from "@/src/lib/session-store";

/**
 * A thin client over Better Auth's HTTP endpoints, which are served by the web
 * app rather than the API. React Native has no cookie jar, so the session
 * cookie is stored and replayed by hand -- see `session-store.ts`.
 */

export interface MobileSession {
  session: {
    isActive: boolean;
    profileCompleted: boolean;
    role: UserRole;
  };
  user: {
    email: string;
    id: string;
    image: string | null;
    name: string;
  };
}

interface AuthErrorPayload {
  message?: string;
}

export class AuthError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

async function authRequest<TResponse>(
  path: string,
  init: RequestInit = {}
): Promise<{ payload: TResponse; setCookie: string | null }> {
  const cookie = await readSessionCookie();
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  // Which handset this is. The device limit is counted where a session is
  // created, but the header rides along on everything -- one place to set it
  // beats remembering which call is a sign-in. ADR-0019.
  headers.set(deviceIdHeader, await readDeviceId());
  headers.set(devicePlatformHeader, readDevicePlatform());
  // React Native sends `Origin: null` on a request it did not originate from a
  // document, and Better Auth's origin check rejects that string outright --
  // `originToValidate === "null"` throws `MISSING_OR_NULL_ORIGIN` before
  // `trustedOrigins` is ever consulted, so no server config can allow it.
  //
  // The check only runs on a request that carries a cookie, which is what made
  // this look intermittent: the first sign-in after a fresh install has no
  // session cookie yet and sails through, and every sign-in after that is
  // rejected. Naming the origin we are actually posting to fixes both. Setting
  // `Origin` is forbidden to a browser's fetch and allowed to this one.
  headers.set("Origin", mobileEnv.webOrigin);

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${mobileEnv.authBaseUrl}/${path.replace(/^\//, "")}`, {
    ...init,
    // React Native keeps its own native cookie store, and it overwrites the
    // `Cookie` header set above with whatever that store holds for the host --
    // which is nothing, because Better Auth scopes the cookie to
    // `Domain=localhost` while the app talks to a LAN address. The session
    // cookie was therefore dropped on the way out and every authenticated
    // request came back as signed out, with the sign-in itself succeeding and
    // a session row sitting in the database. `omit` takes the native store out
    // of the exchange and lets the header we set survive, which is the whole
    // point of replaying the cookie by hand.
    credentials: "omit",
    headers,
    // Same ceiling as api-client.ts: a stalled connection should fail loudly
    // rather than leave the session query pending forever.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const payload = (await response.json().catch(() => null)) as TResponse | null;

  if (!response.ok) {
    throw new AuthError(
      (payload as AuthErrorPayload | null)?.message ?? "Sign-in failed. Check your details."
    );
  }

  return { payload: payload as TResponse, setCookie: response.headers.get("set-cookie") };
}

async function persistCookie(setCookie: string | null): Promise<void> {
  const pairs = extractCookiePairs(setCookie);

  if (pairs) {
    await writeSessionCookie(pairs);
  }
}

export async function signInWithEmail(input: { email: string; password: string }): Promise<void> {
  const { setCookie } = await authRequest("sign-in/email", {
    body: JSON.stringify(input),
    method: "POST"
  });

  await persistCookie(setCookie);
}

export async function signUpWithEmail(input: {
  email: string;
  name: string;
  password: string;
}): Promise<void> {
  const { setCookie } = await authRequest("sign-up/email", {
    body: JSON.stringify(input),
    method: "POST"
  });

  await persistCookie(setCookie);
}

/**
 * Signing in with a handset, which is also how an account is made: if the
 * number is unknown, verifying the code creates it. Two calls, no password.
 *
 * The number must already be canonical — `normalizeBdPhoneE164` from
 * `@mma/shared`, `8801XXXXXXXXX` — because the server takes the string as the
 * account key and rejects anything else. Normalizing on this side rather than
 * theirs is what keeps one person from ending up with two accounts.
 */
export async function sendPhoneOtp(phoneE164: string): Promise<void> {
  await authRequest("phone-number/send-otp", {
    body: JSON.stringify({ phoneNumber: phoneE164 }),
    method: "POST"
  });
}

export async function verifyPhoneOtp(input: { code: string; phoneE164: string }): Promise<void> {
  const { setCookie } = await authRequest("phone-number/verify", {
    body: JSON.stringify({ code: input.code, phoneNumber: input.phoneE164 }),
    method: "POST"
  });

  await persistCookie(setCookie);
}

export type GoogleSignInOutcome = "account-not-found" | "cancelled" | "signed-in";

export interface GoogleSignInOptions {
  /**
   * Whether this press is allowed to create an account. Only the sign-up
   * screen sets it: everywhere else an unknown Google address is answered
   * with a message rather than a new empty account.
   */
  allowSignUp?: boolean;
}

/**
 * Google sign-in, which cannot work the way it does on the web: the OAuth
 * round trip happens in a browser the app cannot read cookies from.
 *
 * The browser begins at `/api/mobile-google-start`, where Better Auth can set
 * the OAuth state cookie in the same cookie jar that Google returns to. On a
 * successful sign-in, `/api/mobile-auth-handoff` mints a single-use,
 * three-minute token and redirects into this app's deep link; then
 * `one-time-token/verify` answers with the `Set-Cookie` stored here.
 *
 * @see apps/web/src/routes/api/mobile-auth-handoff.ts
 */
export async function signInWithGoogle(
  options: GoogleSignInOptions = {}
): Promise<GoogleSignInOutcome> {
  const returnUrl = Linking.createURL("auth-callback");
  const startUrl = new URL("/api/mobile-google-start", mobileEnv.webOrigin);

  startUrl.searchParams.set("redirect", returnUrl);

  if (options.allowSignUp === true) {
    startUrl.searchParams.set("signUp", "1");
  }

  const result = await WebBrowser.openAuthSessionAsync(startUrl.toString(), returnUrl);

  // Closing the browser is a decision, not a failure. It gets no error banner.
  if (result.type === "cancel" || result.type === "dismiss") {
    return "cancelled";
  }

  if (result.type !== "success") {
    throw new AuthError("Google sign-in did not complete.");
  }

  const callbackParams = new URL(result.url).searchParams;

  // The handoff forwards Better Auth's own code. `signup_disabled` is the one
  // the caller can say something useful about: there is no account on that
  // Google address yet.
  if (callbackParams.get("error") === "signup_disabled") {
    return "account-not-found";
  }

  const token = callbackParams.get("token");

  if (token === null) {
    throw new AuthError("Google sign-in did not complete.");
  }

  const { setCookie } = await authRequest("one-time-token/verify", {
    body: JSON.stringify({ token }),
    method: "POST"
  });

  await persistCookie(setCookie);

  // The session was created in the in-app browser, which sent none of this
  // app's headers, so it is holding a slot as an unknown device until the API
  // is told whose it is. Never fatal: the sign-in has already worked.
  try {
    await claimSessionDevice();
  } catch {
    // Nothing to tell the person who just signed in.
  }

  return "signed-in";
}

export async function fetchSession(): Promise<MobileSession | null> {
  const cookie = await readSessionCookie();

  if (!cookie) {
    return null;
  }

  try {
    const { payload } = await authRequest<MobileSession | null>("get-session");

    return payload ?? null;
  } catch {
    // An expired or rejected cookie is not an error the user can act on; it is
    // simply "signed out". Drop it so the next launch does not retry it.
    await clearSessionCookie();

    return null;
  }
}

interface LinkedAccount {
  providerId: string;
}

/**
 * Which credentials the account carries. Only one thing reads it: whether to
 * offer a password change at all. Somebody who arrived through Google or a
 * phone code has no password, and `change-password` can only answer them with
 * an error.
 */
export async function fetchHasPassword(): Promise<boolean> {
  const cookie = await readSessionCookie();

  if (!cookie) {
    return false;
  }

  const { payload } = await authRequest<LinkedAccount[] | null>("list-accounts");

  return (payload ?? []).some((account) => account.providerId === "credential");
}

export async function signOut(): Promise<void> {
  try {
    await authRequest("sign-out", { body: JSON.stringify({}), method: "POST" });
  } finally {
    // Local state is cleared even if the server call fails: the user asked to
    // be signed out on this device, and that must always succeed.
    await clearSessionCookie();
  }
}

/**
 * Asks for the reset link. The mail's link lands on the **web** app, not here:
 * Better Auth's callback checks the token and forwards to `/auth/reset-password`
 * on its own origin, and a token minted for a browser is not something this app
 * can finish anyway.
 *
 * The confirmation never says whether the address is registered — the endpoint
 * answers the same way either way, and so does the screen.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await authRequest("request-password-reset", {
    body: JSON.stringify({ email, redirectTo: "/auth/reset-password" }),
    method: "POST"
  });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await authRequest("change-password", {
    body: JSON.stringify(input),
    method: "POST"
  });
}
