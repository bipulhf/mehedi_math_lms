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

/**
 * The counter, when there is no Redis to keep it in.
 *
 * A per-process window would be a lie under several API processes — each would
 * grant the full limit — but `REDIS_ENABLED=false` means one process (ADR-0015),
 * so this enforces exactly the configured limit. Entries are dropped as their
 * window passes, so the map holds at most one bucket per caller.
 */
const localCounts = new Map<string, number>();
let localBucket = -1;

function countLocally(key: string, bucket: number): number {
  if (bucket !== localBucket) {
    localCounts.clear();
    localBucket = bucket;
  }

  const next = (localCounts.get(key) ?? 0) + 1;

  localCounts.set(key, next);

  return next;
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

    let requestCount: number;

    if (redis === null) {
      requestCount = countLocally(rateLimitKey, windowBucket);
    } else {
      try {
        requestCount = await redis.incr(rateLimitKey);

        if (requestCount === 1) {
          await redis.pexpire(rateLimitKey, options.windowMs);
        }
      } catch (error) {
        // Fail open. This is abuse control, not authorisation: a Redis blip
        // must not turn into a total outage, and the alternative — refusing
        // every request because the counter is unreachable — is a worse
        // failure than the one it prevents.
        context
          .get("logger")
          .warn({ err: error, rateLimitKey }, "Rate limit check failed; allowing");

        return next();
      }
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
