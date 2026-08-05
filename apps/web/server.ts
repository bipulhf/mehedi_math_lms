import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { serve } from "srvx";
import { serveStatic } from "srvx/static";

/**
 * The production entry: static files, the API proxy, then the SSR handler.
 *
 * `vite build` emits two halves. `dist/server/server.js` renders pages and
 * exports nothing but a `fetch`; `dist/client/` holds the hashed CSS, the
 * JavaScript bundles, the fonts and everything under `public/`. Running the
 * server half on its own answers every asset request with the SSR handler's
 * 404, so the browser gets HTML linking a stylesheet it can never load.
 *
 * Built on srvx, the server layer the generated handler already runs on (it
 * imports `h3-v2`), so this file adds three things and invents nothing:
 * `serveStatic` for the client build, a proxy for `/api/v1` and `/api/health`,
 * and the WebSocket hop those need. Vite's dev server does all three in
 * development, and their absence in production is the whole reason a built
 * deployment behaved differently from `bun run dev`.
 *
 * The root `.env` is loaded first, as `apps/api/src/load-root-env.ts` does:
 * `VITE_*` variables are baked in at build time, but the server half needs real
 * ones at run time — Better Auth reads `DATABASE_URL` and `BETTER_AUTH_SECRET`
 * when the auth route is first hit.
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

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.join(appDirectory, "dist/client");
const port = Number(process.env.PORT ?? 3000);

/**
 * Where `/api/v1` and `/api/health` are forwarded.
 *
 * `clientEnv.apiBaseUrl` falls back to a relative `/api/v1` when
 * `VITE_API_BASE_URL` was absent at build time. Proxying makes that correct in
 * production too, and a same-origin call needs no CORS and no rebuild to change
 * the API's address. A build with an absolute `VITE_API_BASE_URL` talks to the
 * API directly and never reaches any of this.
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

/**
 * Headers that describe how the upstream body was *sent*, which stops being
 * true the moment `fetch` hands it back decoded.
 *
 * The API gzips its responses. Passing `content-encoding: gzip` to the browser
 * alongside a body that is no longer gzipped is exactly what "content decoding
 * failed" means in the network tab — and it fails every request rather than
 * degrading quietly.
 */
const HOP_BY_HOP_HEADERS = ["content-encoding", "content-length", "transfer-encoding"];

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
    const headers = new Headers(response.headers);

    for (const header of HOP_BY_HOP_HEADERS) {
      headers.delete(header);
    }

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText
    });
  } catch (error) {
    console.error("API proxy failed", { error, upstream: upstream.href });

    return Response.json({ message: "The API is unreachable", status: "error" }, { status: 502 });
  }
}

interface SocketBridge {
  cookie: string;
  /** Frames the browser sent before the upstream socket finished opening. */
  pending: string[];
  upstream: WebSocket | null;
  url: URL;
}

function isWebSocketUpgrade(request: Request): boolean {
  return request.headers.get("upgrade")?.toLowerCase() === "websocket";
}

/**
 * Messages and notifications ride a socket under `/api/v1`, so the proxy has to
 * carry the upgrade too. Without it the page falls back to "reload to see new
 * messages" and nobody is told why.
 */
const websocket: Bun.WebSocketHandler<SocketBridge> = {
  close: (socket) => {
    socket.data.upstream?.close();
  },
  message: (socket, message) => {
    const frame = typeof message === "string" ? message : message.toString();
    const { upstream } = socket.data;

    // A typing event can be sent before the upstream socket is open; holding it
    // is the difference between a lost keystroke and a dropped feature.
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
};

serve({
  bun: { websocket },
  fetch: async (request) => {
    const url = new URL(request.url);

    if (isProxiedPath(url.pathname)) {
      if (isWebSocketUpgrade(request)) {
        const bunServer = request.runtime?.bun?.server;
        const upgraded = bunServer?.upgrade(request, {
          data: {
            cookie: request.headers.get("cookie") ?? "",
            pending: [],
            upstream: null,
            url
          } satisfies SocketBridge
        });

        return upgraded === true
          ? new Response(null, { status: 101 })
          : new Response("Expected a WebSocket upgrade", { status: 400 });
      }

      return proxyRequest(request, url);
    }

    return handler.fetch(request);
  },
  // Static first, so a hashed asset never reaches the SSR handler. Anything it
  // does not find falls through to `fetch` above.
  middleware: [serveStatic({ dir: clientDirectory })],
  port
});

console.info(`Web server listening on http://localhost:${String(port)}`);
