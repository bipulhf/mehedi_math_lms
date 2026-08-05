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
 * Where `/api/v1` and `/api/health` are forwarded, the way Vite's dev proxy
 * forwards them.
 *
 * Without this the two modes disagree about what a relative API path means.
 * `clientEnv.apiBaseUrl` falls back to `/api/v1` when `VITE_API_BASE_URL` was
 * not present at build time, and in development that resolves through the
 * proxy — while a built site sent it to this server, which answered every call
 * with the SSR handler's `{"error":"Only HTML requests are supported here"}`.
 * Proxying here makes a relative base URL correct in both, and same-origin
 * calls need no CORS and no rebuild to change the API's address.
 *
 * A build that bakes an absolute `VITE_API_BASE_URL` still talks to the API
 * directly and never reaches this code.
 */
const apiTarget = (
  process.env.API_PROXY_TARGET ??
  process.env.VITE_SSR_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ??
  "http://localhost:3001"
).replace(/\/$/, "");

/** `/api/auth/*` is this app's own route, not the API's. */
function isProxiedPath(pathname: string): boolean {
  return pathname === "/api/health" || pathname.startsWith("/api/v1");
}

function isWebSocketUpgrade(request: Request): boolean {
  return request.headers.get("upgrade")?.toLowerCase() === "websocket";
}

interface SocketBridge {
  cookie: string;
  /** Frames the browser sent before the upstream socket finished opening. */
  pending: string[];
  upstream: WebSocket | null;
  url: URL;
}

async function proxyRequest(request: Request, url: URL): Promise<Response> {
  const upstream = new URL(`${url.pathname}${url.search}`, apiTarget);

  try {
    const response = await fetch(upstream, {
      body: request.body,
      // The session cookie travels on this hop, which is the point of proxying.
      headers: request.headers,
      method: request.method,
      redirect: "manual",
      // Bun needs this to stream a request body through.
      ...(request.body === null ? {} : { duplex: "half" })
    } as RequestInit);

    return response;
  } catch (error) {
    console.error("API proxy failed", { error, upstream: upstream.href });

    return Response.json({ message: "The API is unreachable", status: "error" }, { status: 502 });
  }
}

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

const server = Bun.serve<SocketBridge, Record<string, never>>({
  fetch: async (request) => {
    const url = new URL(request.url);
    const { pathname } = url;

    if (isProxiedPath(pathname)) {
      // Messages and notifications ride a socket on the same path prefix, so
      // the proxy has to carry the upgrade too. Without it the page falls back
      // to "reload to see new messages" and nobody is told why.
      if (isWebSocketUpgrade(request)) {
        const upgraded = server.upgrade(request, {
          data: { cookie: request.headers.get("cookie") ?? "", pending: [], upstream: null, url }
        });

        return upgraded ? undefined : new Response("Expected a WebSocket upgrade", { status: 400 });
      }

      return proxyRequest(request, url);
    }

    if (pathname !== "/") {
      const asset = await staticResponse(pathname);

      if (asset !== null) {
        return asset;
      }
    }

    return handler.fetch(request);
  },
  idleTimeout: 60,
  port,
  websocket: {
    close: (socket) => {
      socket.data.upstream?.close();
    },
    message: (socket, message) => {
      const frame = typeof message === "string" ? message : message.toString();
      const { upstream } = socket.data;

      // A typing event can be sent before the upstream socket is open; holding
      // it is the difference between a lost keystroke and a dropped feature.
      if (upstream === null || upstream.readyState !== WebSocket.OPEN) {
        socket.data.pending.push(frame);

        return;
      }

      upstream.send(frame);
    },
    open: (socket) => {
      const { cookie, url } = socket.data;
      const upstreamUrl = new URL(`${url.pathname}${url.search}`, apiTarget);

      upstreamUrl.protocol = upstreamUrl.protocol === "https:" ? "wss:" : "ws:";

      // The session travels as a cookie, and the API's socket route checks it.
      const upstream = new WebSocket(upstreamUrl, { headers: { cookie } });

      socket.data.upstream = upstream;

      upstream.addEventListener("open", () => {
        for (const frame of socket.data.pending) {
          upstream.send(frame);
        }

        socket.data.pending = [];
      });
      upstream.addEventListener("message", (event: MessageEvent<string>) => {
        socket.send(event.data);
      });
      upstream.addEventListener("close", () => {
        socket.close();
      });
      upstream.addEventListener("error", () => {
        socket.close();
      });
    }
  }
});

console.info(`Web server listening on http://localhost:${String(port)}`);
