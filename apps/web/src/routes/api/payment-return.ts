import { createFileRoute } from "@tanstack/react-router";

import { isAllowedAppRedirect, withAppLinkParam } from "@/lib/app-link";

/**
 * The last hop of a mobile enrolment payment.
 *
 * A priced course sends the student to SSLCommerz in an in-app browser. The
 * gateway calls the API, the API settles the payment and then redirects the
 * *browser* to wherever checkout asked it to — which for the web app is
 * `/dashboard/payments/return`, and for the app is here. Without this hop the
 * student ends up looking at the web dashboard inside a sheet they have to
 * dismiss by hand, in front of an app that still believes they have no access.
 *
 * The app passes `redirect` as its own deep link when it starts checkout; the
 * API stores it on the payment and merges its `paymentId` and `status` in on
 * the way back. Nothing here reads the session — the payment has already been
 * settled server-side by the time this runs, and this route only forwards the
 * verdict so the app knows to refetch.
 *
 * @see apps/api/src/services/commerce-service.ts — `buildReturnUrl`
 */
export const Route = createFileRoute("/api/payment-return")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }): Response => {
        const search = new URL(request.url).searchParams;
        const redirectTarget = search.get("redirect");

        if (redirectTarget === null || !isAllowedAppRedirect(redirectTarget)) {
          return new Response("Unsupported redirect target", { status: 400 });
        }

        const paymentId = search.get("paymentId") ?? "";
        // Anything the gateway did not say is "pending": the app then reads the
        // enrolment itself rather than trusting a status it cannot verify.
        const status = search.get("status") ?? "pending";

        return Response.redirect(
          withAppLinkParam(
            withAppLinkParam(redirectTarget, "paymentId", paymentId),
            "status",
            status
          ),
          302
        );
      }
    }
  }
});
