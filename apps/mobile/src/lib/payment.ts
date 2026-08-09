import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { createEnrollment } from "@/src/lib/api";
import { mobileEnv } from "@/src/lib/env";

/**
 * Enrolment checkout, which has the same shape of problem as Google sign-in:
 * the decisive step happens in an in-app browser whose state the app cannot
 * read. Here it is worse, because money moves.
 *
 * The gateway's own callbacks are server-to-server and must land on a real
 * origin, so the app cannot hand it an `mma://` URL. Instead checkout tells the
 * API where to send the *browser* afterwards — a web route that redirects into
 * this app's scheme — and `openAuthSessionAsync` closes the sheet the moment
 * that redirect fires.
 *
 * @see apps/web/src/routes/api/payment-return.ts
 */

const PAYMENT_CALLBACK = "payment-callback";

export type CheckoutOutcome =
  /** A free course, or one this student already had access to. */
  | { kind: "enrolled" }
  | { kind: "paid"; paymentId: string | null }
  /** The student backed out of the gateway, or the gateway reported a cancel. */
  | { kind: "cancelled" }
  | { kind: "failed"; reason: string };

/**
 * The path the API is asked to send the browser back to. The deep link travels
 * in its query string, which is why the API merges rather than concatenates the
 * gateway's own parameters.
 */
export function buildPaymentCallbackPath(returnUrl: string): string {
  return `/api/payment-return?redirect=${encodeURIComponent(returnUrl)}`;
}

export function readCheckoutOutcome(callbackUrl: string): CheckoutOutcome {
  const params = new URL(callbackUrl).searchParams;
  const status = params.get("status");

  if (status === "success") {
    return { kind: "paid", paymentId: params.get("paymentId") };
  }

  if (status === "cancel") {
    return { kind: "cancelled" };
  }

  return {
    kind: "failed",
    reason: "The payment did not go through. Nothing was charged — try again."
  };
}

export async function startCheckout(
  courseId: string,
  couponCode?: string | undefined
): Promise<CheckoutOutcome> {
  const returnUrl = Linking.createURL(PAYMENT_CALLBACK);
  const action = await createEnrollment({
    callbackOrigin: mobileEnv.webOrigin,
    callbackPath: buildPaymentCallbackPath(returnUrl),
    // A coupon can take the payable to zero, and then there is no gateway to
    // open -- the response comes back with requiresPayment false and the
    // enrolment already granted, which the branch below already handles.
    ...(couponCode ? { couponCode } : {}),
    courseId
  });

  if (!action.requiresPayment || action.payment === null) {
    return { kind: "enrolled" };
  }

  const result = await WebBrowser.openAuthSessionAsync(action.payment.gatewayUrl, returnUrl);

  // Closing the sheet is a decision, not a failure — the same rule sign-in
  // follows. It gets no error banner, and the enrol button stays available.
  if (result.type !== "success") {
    return { kind: "cancelled" };
  }

  return readCheckoutOutcome(result.url);
}
