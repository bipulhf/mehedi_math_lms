import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { file } from "bun";
import { config } from "dotenv";

/**
 * The production entry: static files first, then the SSR handler.
 *
 * `vite build` emits two halves. `dist/server/server.js` renders pages and
 * exports nothing but a `fetch`; `dist/client/` holds the hashed CSS, the
 * JavaScript bundles, the fonts and everything under `public/`. Running the
 * server half on its own — which is what this app did — answers every asset
 * request with the SSR 404 page, so the browser gets HTML that links a
 * stylesheet it can never load and the site renders unstyled.
 *
 * Vite's dev server does this job in development, and a CDN or an nginx in
 * front would do it in a larger deployment. This is the small version, so that
 * `bun server.ts` is a complete, correct way to run the site.
 *
 * It also loads the root `.env` first, the way `apps/api/src/load-root-env.ts`
 * does. `VITE_*` variables are baked in at build time, but the server half
 * needs real ones at run time — Better Auth reads `DATABASE_URL` and
 * `BETTER_AUTH_SECRET` when the auth route is first hit. Without them that
 * import throws, and because a failed module is cached, every later request
 * gets `auth` as undefined rather than the original error.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rootEnvPath = path.join(repoRoot, ".env");

if (existsSync(rootEnvPath)) {
  // `override: false`, so a variable already set by the shell or by
  // docker-compose wins over the file.
  config({ path: rootEnvPath, override: false, quiet: true });
}

// After the env, never before: this module pulls in the auth handler, which
// reads it at import time.
const { default: handler } = await import("./dist/server/server.js");

const clientDirectory = new URL("./dist/client/", import.meta.url);
const port = Number(process.env.PORT ?? 3000);

/**
 * A year for anything Vite hashed, because the name changes when the bytes do.
 * Everything else — `favicon`, `firebase-messaging-sw.js`, images copied from
 * `public/` — keeps its name across deploys, so it is only allowed to be
 * cached under revalidation.
 */
function cacheControlFor(pathname: string): string {
  return pathname.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=0, must-revalidate";
}

async function staticResponse(pathname: string): Promise<Response | null> {
  // A request path is not a file path: `..` in it must not walk out of the
  // client directory and start serving the source tree.
  const resolved = new URL(`.${pathname}`, clientDirectory);

  if (!resolved.pathname.startsWith(new URL(clientDirectory).pathname)) {
    return null;
  }

  const candidate = file(resolved);

  if (!(await candidate.exists())) {
    return null;
  }

  return new Response(candidate, {
    headers: { "cache-control": cacheControlFor(pathname) }
  });
}

Bun.serve({
  fetch: async (request) => {
    const { pathname } = new URL(request.url);

    if (pathname !== "/") {
      const asset = await staticResponse(pathname);

      if (asset !== null) {
        return asset;
      }
    }

    return handler.fetch(request);
  },
  idleTimeout: 60,
  port
});

console.info(`Web server listening on http://localhost:${String(port)}`);
