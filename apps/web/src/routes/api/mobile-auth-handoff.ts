import { createFileRoute } from "@tanstack/react-router";

import { isAllowedAppRedirect, withAppLinkParam } from "@/lib/app-link";

/**
 * The last hop of the mobile Google sign-in.
 *
 * The Expo app opens Better Auth's Google flow in an in-app browser. When it
 * finishes, the session cookie exists in that browser and nowhere the app can
 * read it — React Native has no cookie jar. Better Auth is told to land here,
 * so this route mints a single-use, three-minute token for the freshly created
 * session and redirects into the app's deep link with it. The app then calls
 * `one-time-token/verify`, which answers with the `Set-Cookie` it stores.
 *
 * The token is never a bearer credential for the API: it is consumed once, and
 * only exchanges for the session that produced it.
 *
 * @see ./payment-return.ts — the same shape, for the other flow that strands
 *      state in a browser the app cannot read.
 */
export const Route = createFileRoute("/api/mobile-auth-handoff")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }): Promise<Response> => {
        const redirectTarget = new URL(request.url).searchParams.get("redirect");

        if (redirectTarget === null || !isAllowedAppRedirect(redirectTarget)) {
          return new Response("Unsupported redirect target", { status: 400 });
        }

        const { auth } = await import("../../lib/auth-server");

        try {
          const result = await auth.api.generateOneTimeToken({ headers: request.headers });

          if (!result?.token) {
            return Response.redirect(withAppLinkParam(redirectTarget, "error", "no-session"), 302);
          }

          return Response.redirect(withAppLinkParam(redirectTarget, "token", result.token), 302);
        } catch {
          // Every failure mode reaching the app looks the same on purpose: the
          // sign-in did not complete. Details stay on the server.
          return Response.redirect(
            withAppLinkParam(redirectTarget, "error", "sign-in-failed"),
            302
          );
        }
      }
    }
  }
});
