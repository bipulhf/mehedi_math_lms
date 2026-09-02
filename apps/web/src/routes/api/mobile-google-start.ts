import { createFileRoute } from "@tanstack/react-router";

import { isAllowedAppRedirect } from "@/lib/app-link";

interface SocialSignInResponse {
  url: string;
}

function hasSocialSignInUrl(value: unknown): value is SocialSignInResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "url" in value &&
    typeof value.url === "string"
  );
}

/**
 * The first hop of mobile Google sign-in. It must run in the browser: Better
 * Auth places the OAuth state cookie on this response, and React Native's
 * fetch has no cookie jar to carry it through Google's callback.
 *
 * The final hop remains `/api/mobile-auth-handoff`, which swaps the browser
 * session for the app's single-use token.
 */
export const Route = createFileRoute("/api/mobile-google-start")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }): Promise<Response> => {
        const redirectTarget = new URL(request.url).searchParams.get("redirect");

        if (redirectTarget === null || !isAllowedAppRedirect(redirectTarget)) {
          return new Response("Unsupported redirect target", { status: 400 });
        }

        const callbackURL = `/api/mobile-auth-handoff?redirect=${encodeURIComponent(redirectTarget)}`;
        const { auth } = await import("../../lib/auth-server");
        const signInResponse = await auth.api.signInSocial({
          asResponse: true,
          body: { callbackURL, provider: "google" },
          headers: request.headers
        });

        if (!signInResponse.ok) {
          return new Response("Unable to start Google sign-in", { status: 502 });
        }

        const payload: unknown = await signInResponse.json();

        if (!hasSocialSignInUrl(payload)) {
          return new Response("Unable to start Google sign-in", { status: 502 });
        }

        const response = Response.redirect(payload.url, 302);
        const stateCookie = signInResponse.headers.get("set-cookie");

        if (stateCookie) {
          response.headers.set("set-cookie", stateCookie);
        }

        return response;
      }
    }
  }
});
