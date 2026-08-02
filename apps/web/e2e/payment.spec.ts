import { expect, test } from "@playwright/test";

/**
 * Payment is the other flow the build plan named, and the one where a mistake
 * costs money rather than time. `commerce-service.test.ts` exercises the rules
 * against a mocked gateway; what it cannot see is a broken redirect, a callback
 * that never arrives, or a return page that reads the wrong query parameter.
 * That is what this file is for.
 *
 * The gateway callbacks are deliberately unauthenticated — SSLCommerz calls
 * them server-to-server — so the assertions below are about what an *unknown*
 * or forged callback must not achieve.
 */

const UNKNOWN_ID = "11111111-1111-4111-8111-111111111111";

/** See auth-gating.spec.ts: the dashboard chunk compiles on first navigation. */
const GUARD_REDIRECT_TIMEOUT_MS = 45_000;

test.describe("payment endpoints refuse an anonymous caller", () => {
  test("starting a payment is rejected", async ({ request }) => {
    const response = await request.post("/api/v1/payments/init", {
      data: { courseId: UNKNOWN_ID }
    });

    expect(response.status()).toBe(401);
    expect((await response.json()).status).toBe("error");
  });

  test("my payment history is rejected", async ({ request }) => {
    expect((await request.get("/api/v1/payments/me")).status()).toBe(401);
  });

  test("the accounting ledger is rejected", async ({ request }) => {
    expect((await request.get("/api/v1/payments")).status()).toBe(401);
  });

  test("a single payment cannot be read without a session", async ({ request }) => {
    expect((await request.get(`/api/v1/payments/${UNKNOWN_ID}`)).status()).toBe(401);
  });

  test("a refund cannot be issued without a session", async ({ request }) => {
    const response = await request.post(`/api/v1/payments/${UNKNOWN_ID}/refund`, { data: {} });

    expect(response.status()).toBe(401);
  });
});

test.describe("gateway callbacks", () => {
  for (const outcome of ["success", "fail", "cancel"] as const) {
    test(`a ${outcome} callback for an unknown payment is a 404, not a redirect`, async ({
      request
    }) => {
      // A forged callback must not settle anything. 404 is the only acceptable
      // answer: a 302 here would mean the app took the callback at its word.
      const response = await request.get(
        `/api/v1/payments/${outcome}?paymentId=${UNKNOWN_ID}&tran_id=UNKNOWN`,
        { maxRedirects: 0 }
      );

      expect(response.status()).toBe(404);
    });

    test(`a ${outcome} callback naming no payment at all is a 404`, async ({ request }) => {
      const response = await request.get(`/api/v1/payments/${outcome}`, { maxRedirects: 0 });

      expect(response.status()).toBe(404);
    });
  }

  test("validating an unknown gateway id does not 500", async ({ request }) => {
    const response = await request.get("/api/v1/payments/validate/NOT-A-REAL-VALIDATION-ID");

    expect(response.status()).toBeLessThan(500);
  });

  test("the validation id is required, so the route does not exist without one", async ({
    request
  }) => {
    const response = await request.get("/api/v1/payments/validate/");

    expect([301, 302, 401, 404]).toContain(response.status());
  });
});

test.describe("the return page", () => {
  test("is gated behind sign-in", async ({ page }) => {
    await page.goto("/dashboard/payments/return?status=success");

    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: GUARD_REDIRECT_TIMEOUT_MS });
  });

  test("the mock gateway page is gated too", async ({ page }) => {
    // It can hand out success callbacks, so it is not a public page even in
    // development.
    await page.goto(`/dashboard/payments/mock?paymentId=${UNKNOWN_ID}&transactionId=T1`);

    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: GUARD_REDIRECT_TIMEOUT_MS });
  });
});
