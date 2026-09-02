import type { UserRole } from "@mma/shared";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { REQUEST_TIMEOUT_MS } from "@/src/lib/api-client";
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

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${mobileEnv.authBaseUrl}/${path.replace(/^\//, "")}`, {
    ...init,
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

export type GoogleSignInOutcome = "cancelled" | "signed-in";

/**
 * Google sign-in, which cannot work the way it does on the web: the OAuth
 * round trip happens in a browser the app cannot read cookies from.
 *
 * So the browser is sent to `/api/mobile-auth-handoff` on the web app instead
 * of a dashboard. That route mints a single-use, three-minute token for the
 * session it just created and redirects into this app's deep link with it;
 * `one-time-token/verify` then answers with the `Set-Cookie` stored here.
 *
 * @see apps/web/src/routes/api/mobile-auth-handoff.ts
 */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  const returnUrl = Linking.createURL("auth-callback");
  const callbackURL = `/api/mobile-auth-handoff?redirect=${encodeURIComponent(returnUrl)}`;
  const { payload } = await authRequest<{ redirect?: boolean; url?: string }>("sign-in/social", {
    body: JSON.stringify({ callbackURL, provider: "google" }),
    method: "POST"
  });

  if (!payload?.url) {
    throw new AuthError("Google sign-in is not available right now.");
  }

  const result = await WebBrowser.openAuthSessionAsync(payload.url, returnUrl);

  // Closing the browser is a decision, not a failure. It gets no error banner.
  if (result.type === "cancel" || result.type === "dismiss") {
    return "cancelled";
  }

  if (result.type !== "success") {
    throw new AuthError("Google sign-in did not complete.");
  }

  const token = new URL(result.url).searchParams.get("token");

  if (token === null) {
    throw new AuthError("Google sign-in did not complete.");
  }

  const { setCookie } = await authRequest("one-time-token/verify", {
    body: JSON.stringify({ token }),
    method: "POST"
  });

  await persistCookie(setCookie);

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
