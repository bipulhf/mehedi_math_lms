import * as WebBrowser from "expo-web-browser";

import {
  fetchSession,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  type MobileSession
} from "@/src/lib/auth";
import { clearSessionCookie, extractCookiePairs, readSessionCookie } from "@/src/lib/session-store";

/**
 * The session is a cookie this app stores and replays by hand. Three things
 * here are worth a test each: that a successful sign-in persists it, that a
 * rejected one is treated as "signed out" rather than as an error, and that
 * dismissing the Google sheet is a decision rather than a failure.
 */

const fetchMock = jest.fn();
const openAuthSession = WebBrowser.openAuthSessionAsync as jest.MockedFunction<
  typeof WebBrowser.openAuthSessionAsync
>;

const SESSION: MobileSession = {
  session: { isActive: true, profileCompleted: true, role: "STUDENT" },
  user: { email: "student@example.com", id: "user-1", image: null, name: "Student" }
};

function respondWith(body: unknown, init: { setCookie?: string; status?: number } = {}): void {
  fetchMock.mockResolvedValueOnce({
    headers: new Headers(init.setCookie ? { "set-cookie": init.setCookie } : {}),
    json: async () => body,
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200
  });
}

beforeEach(async () => {
  fetchMock.mockReset();
  openAuthSession.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  await clearSessionCookie();
});

describe("extractCookiePairs", () => {
  test("keeps the name=value pairs and drops the attributes", () => {
    expect(
      extractCookiePairs("better-auth.session_token=abc; Path=/; HttpOnly; SameSite=Lax")
    ).toBe("better-auth.session_token=abc");
  });

  test("splits a runtime that joined several cookies with commas", () => {
    expect(
      extractCookiePairs("a=1; Path=/; Expires=Wed, 09 Jun 2027 10:18:14 GMT, b=2; Path=/")
    ).toBe("a=1; b=2");
  });

  test("a header with no pair in it stores nothing", () => {
    // Only the leading segment of each cookie is read, and `Set-Cookie` always
    // opens with `name=value` — so anything without a `=` there is not a cookie.
    expect(extractCookiePairs(null)).toBeNull();
    expect(extractCookiePairs("")).toBeNull();
    expect(extractCookiePairs("HttpOnly; Secure")).toBeNull();
  });
});

describe("signInWithEmail", () => {
  test("persists the cookie the server set", async () => {
    respondWith(SESSION, { setCookie: "better-auth.session_token=abc; Path=/; HttpOnly" });

    await signInWithEmail({ email: "student@example.com", password: "hunter2hunter2" });

    await expect(readSessionCookie()).resolves.toBe("better-auth.session_token=abc");
  });

  test("surfaces the server's message rather than a generic one", async () => {
    respondWith({ message: "Invalid email or password" }, { status: 401 });

    await expect(
      signInWithEmail({ email: "student@example.com", password: "wrong" })
    ).rejects.toThrow("Invalid email or password");
  });
});

describe("fetchSession", () => {
  test("does not call the server when there is no cookie to send", async () => {
    await expect(fetchSession()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a rejected cookie means signed out, and is cleared so the next launch does not retry it", async () => {
    respondWith(SESSION, { setCookie: "better-auth.session_token=stale; Path=/" });
    await signInWithEmail({ email: "student@example.com", password: "hunter2hunter2" });

    respondWith({ message: "Unauthorized" }, { status: 401 });

    await expect(fetchSession()).resolves.toBeNull();
    await expect(readSessionCookie()).resolves.toBeNull();
  });
});

describe("signInWithGoogle", () => {
  test("closing the browser is cancelled, not an error", async () => {
    respondWith({ url: "https://accounts.google.test/o/oauth2/auth?x=1" });
    openAuthSession.mockResolvedValueOnce({ type: WebBrowser.WebBrowserResultType.DISMISS });

    await expect(signInWithGoogle()).resolves.toBe("cancelled");
  });

  test("exchanges the one-time token for the cookie it stores", async () => {
    respondWith({ url: "https://accounts.google.test/o/oauth2/auth?x=1" });
    openAuthSession.mockResolvedValueOnce({
      type: "success",
      url: "mma://auth-callback?token=one-time-abc"
    });
    respondWith(SESSION, { setCookie: "better-auth.session_token=fresh; Path=/" });

    await expect(signInWithGoogle()).resolves.toBe("signed-in");
    await expect(readSessionCookie()).resolves.toBe("better-auth.session_token=fresh");

    const [verifyUrl, verifyInit] = fetchMock.mock.calls.at(-1) as [string, RequestInit];

    expect(verifyUrl).toContain("one-time-token/verify");
    expect(JSON.parse(String(verifyInit.body))).toEqual({ token: "one-time-abc" });
  });

  test("sends Better Auth to the handoff route, not to a dashboard", async () => {
    // The whole design rests on this: a dashboard would leave the session in a
    // browser the app cannot read.
    respondWith({ url: "https://accounts.google.test/o/oauth2/auth?x=1" });
    openAuthSession.mockResolvedValueOnce({ type: WebBrowser.WebBrowserResultType.CANCEL });

    await signInWithGoogle();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { callbackURL: string; provider: string };

    expect(body.provider).toBe("google");
    expect(body.callbackURL).toContain("/api/mobile-auth-handoff?redirect=");
  });

  test("a callback carrying no token fails rather than appearing to sign in", async () => {
    respondWith({ url: "https://accounts.google.test/o/oauth2/auth?x=1" });
    openAuthSession.mockResolvedValueOnce({
      type: "success",
      url: "mma://auth-callback?error=no-session"
    });

    await expect(signInWithGoogle()).rejects.toThrow("Google sign-in did not complete.");
    await expect(readSessionCookie()).resolves.toBeNull();
  });
});

describe("signOut", () => {
  test("clears the local cookie even when the server call fails", async () => {
    respondWith(SESSION, { setCookie: "better-auth.session_token=abc; Path=/" });
    await signInWithEmail({ email: "student@example.com", password: "hunter2hunter2" });

    fetchMock.mockRejectedValueOnce(new Error("Network request failed"));

    await expect(signOut()).rejects.toThrow("Network request failed");
    await expect(readSessionCookie()).resolves.toBeNull();
  });
});
