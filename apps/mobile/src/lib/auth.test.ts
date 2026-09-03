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
    openAuthSession.mockResolvedValueOnce({ type: WebBrowser.WebBrowserResultType.DISMISS });

    await expect(signInWithGoogle()).resolves.toBe("cancelled");
  });

  test("exchanges the one-time token for the cookie it stores", async () => {
    openAuthSession.mockResolvedValueOnce({
      type: "success",
      url: "mma://auth-callback?token=one-time-abc"
    });
    respondWith(SESSION, { setCookie: "better-auth.session_token=fresh; Path=/" });

    await expect(signInWithGoogle()).resolves.toBe("signed-in");
    await expect(readSessionCookie()).resolves.toBe("better-auth.session_token=fresh");

    // Not the last call: the device claim follows the exchange, because a
    // session opened in the in-app browser carries none of this app's headers.
    const verifyCall = fetchMock.mock.calls.find(([url]: [string]) =>
      String(url).includes("one-time-token/verify")
    ) as [string, RequestInit] | undefined;

    expect(verifyCall).toBeDefined();
    expect(JSON.parse(String(verifyCall?.[1].body))).toEqual({ token: "one-time-abc" });

    const [claimUrl] = fetchMock.mock.calls.at(-1) as [string, RequestInit];

    expect(claimUrl).toContain("auth/device");
  });

  test("opens the browser at the stateful mobile start route", async () => {
    openAuthSession.mockResolvedValueOnce({ type: WebBrowser.WebBrowserResultType.CANCEL });

    await signInWithGoogle();

    const [startUrl, returnUrl] = openAuthSession.mock.calls[0] as [string, string];

    expect(startUrl).toContain("/api/mobile-google-start?redirect=mma%3A%2F%2Fauth-callback");
    expect(returnUrl).toBe("mma://auth-callback");
  });

  // The account does not exist, which is a sentence the screen can say. It is
  // not a failure, so it comes back as an outcome rather than a thrown error.
  test("an unknown Google address is an outcome, not an error", async () => {
    openAuthSession.mockResolvedValueOnce({
      type: "success",
      url: "mma://auth-callback?error=signup_disabled"
    });

    await expect(signInWithGoogle()).resolves.toBe("account-not-found");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("only the sign-up screen asks Google to create an account", async () => {
    openAuthSession.mockResolvedValue({ type: WebBrowser.WebBrowserResultType.CANCEL });

    await signInWithGoogle();
    await signInWithGoogle({ allowSignUp: true });

    const [signInUrl] = openAuthSession.mock.calls[0] as [string, string];
    const [signUpUrl] = openAuthSession.mock.calls[1] as [string, string];

    expect(signInUrl).not.toContain("signUp=1");
    expect(signUpUrl).toContain("signUp=1");
  });

  test("a callback carrying no token fails rather than appearing to sign in", async () => {
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
