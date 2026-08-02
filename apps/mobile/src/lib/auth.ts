import type { UserRole } from "@mma/shared";

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
    headers
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

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<void> {
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
