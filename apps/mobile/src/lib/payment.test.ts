import { buildPaymentCallbackPath, readCheckoutOutcome } from "@/src/lib/payment";

/**
 * The checkout hand-off, tested where it is decidable: the URL the API is asked
 * to redirect to, and what the app concludes from the one it gets back. Money
 * has already moved by the time the second of these runs, so a wrong reading
 * here means a paying student is told their payment failed.
 */

describe("buildPaymentCallbackPath", () => {
  test("is a path, so the API cannot be pointed at another origin", () => {
    expect(buildPaymentCallbackPath("genex://payment-callback")).toMatch(/^\/api\/payment-return\?/);
  });

  test("encodes the deep link, so its own scheme does not break the query", () => {
    const path = buildPaymentCallbackPath("exp://192.168.0.9:8081/--/payment-callback");
    const redirect = new URL(path, "https://app.test").searchParams.get("redirect");

    expect(redirect).toBe("exp://192.168.0.9:8081/--/payment-callback");
  });
});

describe("readCheckoutOutcome", () => {
  test("a settled payment is paid, and carries the id the API stamped on it", () => {
    expect(readCheckoutOutcome("genex://payment-callback?status=success&paymentId=pay-1")).toEqual({
      kind: "paid",
      paymentId: "pay-1"
    });
  });

  test("a cancelled checkout is not a failure", () => {
    // The enrol button stays available and no banner appears. Backing out of a
    // gateway is a decision.
    expect(readCheckoutOutcome("genex://payment-callback?status=cancel")).toEqual({
      kind: "cancelled"
    });
  });

  test("anything else is a failure the student can read", () => {
    const outcome = readCheckoutOutcome("genex://payment-callback?status=fail&paymentId=pay-1");

    expect(outcome.kind).toBe("failed");
  });

  test("a callback with no status at all is a failure rather than a silent success", () => {
    // The API always sets one. If it is missing, something rewrote the URL, and
    // granting access on that basis would be the worst possible default.
    expect(readCheckoutOutcome("genex://payment-callback").kind).toBe("failed");
  });
});
