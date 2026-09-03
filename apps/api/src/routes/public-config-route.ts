import { Hono } from "hono";

import { env } from "@/lib/env";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export const publicConfigRoutes = new Hono<AppBindings>();

publicConfigRoutes.get("/firebase-config", (context) => {
  // Null rather than an error: a browser with no push configuration behind it
  // is a working browser with one feature off, and both the page and the
  // service worker are written to read it that way.
  return success(context, env.firebaseClientConfig);
});
