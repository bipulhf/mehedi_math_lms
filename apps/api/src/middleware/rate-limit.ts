import type { MiddlewareHandler } from "hono";

import { env } from "@/lib/env";
import { redis } from "@/lib/redis";
import type { AppBindings } from "@/types/app-bindings";
import { error } from "@/utils/response";

interface RateLimitOptions {
  keyPrefix: string;
  max: number;
  windowMs: number;
}

function getClientAddress(context: Parameters<MiddlewareHandler<AppBindings>>[0]): string {
  return (
    context.req.header("cf-connecting-ip") ??
    context.req.header("x-real-ip") ??
    context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function createRateLimitMiddleware(
  options: RateLimitOptions = {
    keyPrefix: "api",
    max: env.RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW_MS
  }
): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    const requestId = context.get("requestId");
    const windowBucket = Math.floor(Date.now() / options.windowMs);
    const clientAddress = getClientAddress(context);
    const rateLimitKey = `rl:${options.keyPrefix}:${clientAddress}:${windowBucket}`;

    const requestCount = await redis.incr(rateLimitKey);

    if (requestCount === 1) {
      await redis.pexpire(rateLimitKey, options.windowMs);
    }

    context.header("x-rate-limit-limit", String(options.max));
    context.header("x-rate-limit-remaining", String(Math.max(options.max - requestCount, 0)));

    if (requestCount > options.max) {
      context.get("logger").warn({
        requestId,
        clientAddress,
        rateLimitKey
      });

      return error(context, "Too many requests", 429);
    }

    await next();
  };
}
