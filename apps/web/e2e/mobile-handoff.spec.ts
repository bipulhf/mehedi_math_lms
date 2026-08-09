import { expect, test } from "@playwright/test";

/**
 * The two routes that hand control back to the Expo app.
 *
 * Both take a redirect target from the query string, which is the shape of an
 * open redirect: without the allow-list either would bounce a signed-in user —
 * one-time token and all — to any host an attacker named. Unit tests cannot see
 * this, because what is being asserted is what a real HTTP response does with a
 * `Location` header.
 *
 * Redirects are never followed here. `mma://` is not fetchable, and following
 * would turn a passing assertion into a connection error.
 */

const PAYMENT_ID = "11111111-1111-4111-8111-111111111111";
const APP_LINK = "mma://payment-callback";
const AUTH_LINK = "mma://auth-callback";

test.describe("/api/payment-return", () => {
  test("redirects into the app, carrying the gateway's verdict", async ({ request }) => {
    const response = await request.get(
      `/api/payment-return?redirect=${encodeURIComponent(APP_LINK)}&paymentId=${PAYMENT_ID}&status=success`,
      { maxRedirects: 0 }
    );

    expect(response.status()).toBe(302);

    const location = new URL(response.headers().location ?? "");

    expect(location.protocol).toBe("mma:");
    expect(location.searchParams.get("paymentId")).toBe(PAYMENT_ID);
    expect(location.searchParams.get("status")).toBe("success");
  });

  test("a missing status is pending, not success", async ({ request }) => {
    // The app then reads the enrolment itself. Defaulting the other way would
    // grant access on a URL nobody verified.
    const response = await request.get(
      `/api/payment-return?redirect=${encodeURIComponent(APP_LINK)}&paymentId=${PAYMENT_ID}`,
      { maxRedirects: 0 }
    );

    expect(new URL(response.headers().location ?? "").searchParams.get("status")).toBe("pending");
  });

  test("refuses to redirect anywhere but an app scheme", async ({ request }) => {
    for (const target of [
      "https://evil.test/steal",
      "//evil.test/steal",
      "javascript:alert(1)",
      "/dashboard",
      ""
    ]) {
      const response = await request.get(
        `/api/payment-return?redirect=${encodeURIComponent(target)}`,
        { maxRedirects: 0 }
      );

      expect(response.status(), `redirect=${target}`).toBe(400);
    }
  });

  test("refuses when no target is named at all", async ({ request }) => {
    expect((await request.get("/api/payment-return", { maxRedirects: 0 })).status()).toBe(400);
  });
});

test.describe("/api/mobile-auth-handoff", () => {
  test("an anonymous caller gets no token, and is told so in the app's own scheme", async ({
    request
  }) => {
    const response = await request.get(
      `/api/mobile-auth-handoff?redirect=${encodeURIComponent(AUTH_LINK)}`,
      { maxRedirects: 0 }
    );

    expect(response.status()).toBe(302);

    const location = new URL(response.headers().location ?? "");

    expect(location.protocol).toBe("mma:");
    // The whole point: no session, no token. Every failure mode reaching the
    // app looks the same, and none of them carries a credential.
    expect(location.searchParams.has("token")).toBe(false);
    expect(location.searchParams.get("error")).not.toBeNull();
  });

  test("refuses to redirect anywhere but an app scheme", async ({ request }) => {
    for (const target of ["https://evil.test/steal", "//evil.test", "/dashboard"]) {
      const response = await request.get(
        `/api/mobile-auth-handoff?redirect=${encodeURIComponent(target)}`,
        { maxRedirects: 0 }
      );

      expect(response.status(), `redirect=${target}`).toBe(400);
    }
  });
});

test.describe("one-time tokens are not mintable by a client", () => {
  /**
   * `disableClientRequest: true` on the `oneTimeToken` plugin is what makes the
   * handoff a boundary rather than a bypass. If this endpoint ever answers over
   * HTTP, any authenticated client can mint a session-exchange token.
   *
   * An anonymous refusal is what can be asserted without a fixture account; the
   * signed-in case is the manual check in `docs/mobile-plan.md`, Stage 3.
   */
  test("the generate endpoint does not answer an anonymous request with a token", async ({
    request
  }) => {
    const response = await request.get("/api/auth/one-time-token/generate", { maxRedirects: 0 });

    expect(response.ok()).toBe(false);
    expect(await response.text()).not.toContain("token");
  });

  test("verifying a token that was never issued fails", async ({ request }) => {
    const response = await request.post("/api/auth/one-time-token/verify", {
      data: { token: "not-a-token-that-was-ever-minted" }
    });

    expect(response.ok()).toBe(false);
    expect(response.headers()["set-cookie"]).toBeUndefined();
  });
});
