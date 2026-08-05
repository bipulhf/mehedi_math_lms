import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { Hono } from "hono";

import { env } from "@/lib/env";
import type { AppBindings } from "@/types/app-bindings";
import { auditTrailMiddleware } from "@/middleware/audit-trail";
import { onError } from "@/middleware/error-handler";
import { sessionContextMiddleware } from "@/middleware/session-context";
import { requestLoggerMiddleware } from "@/middleware/request-logger";
import { requestIdMiddleware } from "@/middleware/request-id";
import { createRateLimitMiddleware } from "@/middleware/rate-limit";
import { healthRoutes } from "@/routes/health-route";
import { siteSeoRoutes } from "@/routes/site-seo-route";
import { v1Routes } from "@/routes/v1";
import { error } from "@/utils/response";

export const app = new Hono<AppBindings>();

app.use("*", requestIdMiddleware);
app.use("*", requestLoggerMiddleware);
app.use(
  "*",
  cors({
    origin: env.corsOrigins,
    // The session is a cookie, and the browser only sends one cross-origin when
    // the response says so. Development never needed this because Vite proxies
    // /api/v1, making every call same-origin -- so a built deployment, where
    // the browser talks to the API directly, was the first place a signed-in
    // request arrived anonymous and the page reported that something went
    // wrong. `origin` is an allowlist rather than "*" precisely so this is
    // allowed to be true.
    credentials: true,
    allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    exposeHeaders: ["X-Request-Id", "X-Rate-Limit-Limit", "X-Rate-Limit-Remaining"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
);
app.use("*", bodyLimit({ maxSize: env.BODY_LIMIT_BYTES }));
app.use("*", compress());
if (env.NODE_ENV !== "development") {
  app.use("/api/*", createRateLimitMiddleware());
}
app.use("/api/v1/*", sessionContextMiddleware);
// After the session, so it knows who acted; around the routes, so it can see
// whether one of them described the action itself.
app.use("/api/v1/*", auditTrailMiddleware);

app.onError(onError);
app.notFound((context) => error(context, "Route not found", 404));

app.route("/", siteSeoRoutes);
app.route("/api/health", healthRoutes);
app.route("/api/v1", v1Routes);
