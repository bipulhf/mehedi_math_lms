import { Redirect } from "expo-router";
import type { JSX } from "react";

/**
 * The landing pad for `mma://payment-callback`, for the same reason
 * `auth-callback` has one: Android delivers the deep link through `Linking` as
 * well as resolving the browser session, and an unrouted path would show
 * `+not-found` immediately after a successful payment.
 *
 * The outcome is handled by the course screen that opened the sheet, which is
 * where the enrolment queries and the navigation target already live.
 */
export default function PaymentCallbackScreen(): JSX.Element {
  return <Redirect href="/(tabs)/learning" />;
}
