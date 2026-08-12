import { Hono } from "hono";
import { createRouteHandler } from "uploadthing/server";

import { env } from "@/lib/env";
import { uploadthingRouter } from "@/lib/uploadthing-router";
import type { AppBindings } from "@/types/app-bindings";

/**
 * Where UploadThing POSTs back once the browser has finished uploading, which
 * is what runs `onUploadComplete` and writes the upload row.
 *
 * Pinned rather than derived. Left unset, UploadThing builds it from the
 * request's `x-forwarded-host` or `host` (`@uploadthing/shared`'s
 * `getRequestUrl`) — and the request this API sees came through
 * `apps/web/server.ts`'s proxy to `localhost:3001`, so the derived URL is an
 * address UploadThing's servers cannot reach. Development never hits this:
 * `NODE_ENV=development` puts UploadThing in dev mode, where the callback is
 * delivered over the SDK's own hook instead. That asymmetry is why an upload
 * can work locally and silently never complete in production.
 *
 * `APP_URL` and not the API's own origin: the API is not publicly exposed, and
 * `/api/v1` on the web app proxies here.
 */
const callbackUrl = `${env.APP_URL.replace(/\/$/, "")}/api/v1/uploadthing`;

const handlers = createRouteHandler({ config: { callbackUrl }, router: uploadthingRouter });

export const uploadthingRoutes = new Hono<AppBindings>();

uploadthingRoutes.all("/*", (context) => handlers(context.req.raw));
