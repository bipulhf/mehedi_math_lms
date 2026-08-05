import Redis from "ioredis";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Two client shapes, because a request and a queue worker want opposite things
 * from a broken connection.
 *
 * **The request path must fail fast.** ioredis defaults to an offline queue and
 * this client used to be built with `maxRetriesPerRequest: null`, which together
 * mean a command issued while Redis is unreachable is parked until it comes
 * back — the promise never settles. Every `try/catch` around a cache read was
 * therefore decorative, and the rate limiter, which has no guard at all, hung
 * every API request for as long as the outage lasted. `enableOfflineQueue:
 * false` plus a command timeout turns that into an error in a millisecond,
 * which the callers can and do handle.
 *
 * **A queue worker must not.** BullMQ blocks on `BRPOPLPUSH` for seconds at a
 * time by design, so its connection keeps `maxRetriesPerRequest: null` and no
 * timeout. That is why `createQueueConnection` exists rather than sharing one
 * client for everything.
 *
 * Reconnection is untouched in both: only *commands* give up quickly, the
 * socket keeps trying to come back.
 */

// Not annotated `RedisOptions`: under `exactOptionalPropertyTypes` that type
// widens every optional to `| undefined` and no longer matches the constructor
// overload. An inferred literal does.
const requestClientOptions = {
  commandTimeout: env.REDIS_COMMAND_TIMEOUT_MS,
  enableAutoPipelining: true,
  // A command issued while the socket is down fails instead of queueing.
  enableOfflineQueue: false,
  lazyConnect: true,
  maxRetriesPerRequest: 1
};

const queueClientOptions = {
  // BullMQ's own requirement: its blocking reads must not be given up on.
  maxRetriesPerRequest: null
};

/** The shared client for caches, the rate limiter, presence and ad-hoc reads. */
export const redis = new Redis(env.REDIS_URL, requestClientOptions);

/**
 * A connection for BullMQ. Each queue and worker gets its own, because a
 * blocking read occupies the connection it runs on.
 */
export function createQueueConnection(): Redis {
  return new Redis(env.REDIS_URL, queueClientOptions);
}

/**
 * Opens the connection at boot so a bad `REDIS_URL` is a startup failure rather
 * than a wall of hung requests an hour later.
 */
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (error) {
    logger.fatal({ err: error }, "Redis is unreachable");
    process.exit(1);
  }
}
