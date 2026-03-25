import type { MiddlewareHandler } from "hono";

import { logger } from "@/lib/logger";
import type { AppBindings } from "@/types/app-bindings";

export const requestLoggerMiddleware: MiddlewareHandler<AppBindings> = async (context, next) => {
  const startTime = Date.now();
  const requestId = context.get("requestId");
  const requestLogger = logger.child({
    requestId,
    method: context.req.method,
    path: context.req.path
  });

  context.set("logger", requestLogger);

  await next();

  requestLogger.info({
    statusCode: context.res.status,
    durationMs: Date.now() - startTime
  });
};
