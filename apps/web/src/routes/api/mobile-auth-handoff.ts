import { createFileRoute } from "@tanstack/react-router";

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
 */

/** Only app schemes. Anything else here would make this an open redirect. */
const ALLOWED_REDIRECT_SCHEMES = ["mma:", "exp:", "exps:"] as const;

function isAllowedRedirect(target: string): boolean {
  try {
    const url = new URL(target);

    return ALLOWED_REDIRECT_SCHEMES.some((scheme) => url.protocol === scheme);
  } catch {
    return false;
  }
}

function withParam(target: string, key: string, value: string): string {
  const url = new URL(target);

  url.searchParams.set(key, value);

  return url.toString();
}

export const Route = createFileRoute("/api/mobile-auth-handoff")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }): Promise<Response> => {
        const redirectTarget = new URL(request.url).searchParams.get("redirect");

        if (redirectTarget === null || !isAllowedRedirect(redirectTarget)) {
          return new Response("Unsupported redirect target", { status: 400 });
        }

        const { auth } = await import("../../lib/auth-server");

        try {
          const result = await auth.api.generateOneTimeToken({ headers: request.headers });

          if (!result?.token) {
            return Response.redirect(withParam(redirectTarget, "error", "no-session"), 302);
          }

          return Response.redirect(withParam(redirectTarget, "token", result.token), 302);
        } catch {
          // Every failure mode reaching the app looks the same on purpose: the
          // sign-in did not complete. Details stay on the server.
          return Response.redirect(withParam(redirectTarget, "error", "sign-in-failed"), 302);
        }
      }
    }
  }
});
