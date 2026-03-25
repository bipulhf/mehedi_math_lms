import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { Hono } from "hono";

import { env } from "@/lib/env";
import type { AppBindings } from "@/types/app-bindings";
import { onError } from "@/middleware/error-handler";
import { requestLoggerMiddleware } from "@/middleware/request-logger";
import { requestIdMiddleware } from "@/middleware/request-id";
import { createRateLimitMiddleware } from "@/middleware/rate-limit";
import { healthRoutes } from "@/routes/health.route";
import { v1Routes } from "@/routes/v1";
import { error } from "@/utils/response";

export const app = new Hono<AppBindings>();

app.use("*", requestIdMiddleware);
app.use("*", requestLoggerMiddleware);
app.use(
  "*",
  cors({
    origin: env.corsOrigins,
    allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    exposeHeaders: ["X-Request-Id", "X-Rate-Limit-Limit", "X-Rate-Limit-Remaining"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
);
app.use("*", bodyLimit({ maxSize: env.BODY_LIMIT_BYTES }));
app.use("*", compress());
app.use("/api/*", createRateLimitMiddleware());

app.onError(onError);
app.notFound((context) => error(context, "Route not found", 404));

app.route("/api/health", healthRoutes);
app.route("/api/v1", v1Routes);
