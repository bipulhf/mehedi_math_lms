/**
 * Read-through Redis cache for the handful of reads that are both hot and
 * identical for every caller: the public course catalogue, the category tree,
 * analytics aggregates, and lecture comment threads.
 *
 * Two rules shape this module.
 *
 * 1. **The cache is never load-bearing.** Every failure path -- Redis down,
 *    unparseable payload, a value that no longer matches its type -- falls
 *    through to the loader. A cache outage must degrade latency, never
 *    correctness or availability.
 * 2. **Invalidation is explicit, through an index.** `SCAN`-by-pattern is
 *    O(keyspace) and `KEYS` blocks the server, so every cached key is also
 *    added to a Redis set. Invalidating an index deletes its members and then
 *    the set itself.
 */
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

const KEY_PREFIX = "cache";
const INDEX_PREFIX = "cache:index";
/** Index sets outlive their members so they are given a ceiling of their own. */
const INDEX_TTL_SECONDS = 24 * 60 * 60;

export const cacheTtlSeconds = {
  analytics: 300,
  categories: 900,
  comments: 60,
  courses: 120
} as const;

interface SerialisedDate {
  __date: string;
}

function isSerialisedDate(value: unknown): value is SerialisedDate {
  return (
    typeof value === "object" &&
    value !== null &&
    "__date" in value &&
    typeof (value as SerialisedDate).__date === "string"
  );
}

/**
 * `Date.prototype.toJSON` runs before a replacer sees the value, so the raw
 * date has to be recovered from `this`. Without this the repository records
 * would come back out of the cache with strings where the mappers expect Dates.
 */
function replacer(this: Record<string, unknown>, key: string, value: unknown): unknown {
  const raw = this[key];

  return raw instanceof Date ? { __date: raw.toISOString() } : value;
}

function reviver(_key: string, value: unknown): unknown {
  return isSerialisedDate(value) ? new Date(value.__date) : value;
}

export function serialiseCacheValue(value: unknown): string {
  return JSON.stringify(value, replacer);
}

export function deserialiseCacheValue<T>(payload: string): T {
  return JSON.parse(payload, reviver) as T;
}

/** Builds `cache:<namespace>:<part>:<part>`; nullish parts become `-`. */
export function buildCacheKey(namespace: string, ...parts: readonly (string | number | boolean | null | undefined)[]): string {
  const suffix = parts.map((part) => (part === null || part === undefined ? "-" : String(part))).join(":");

  return suffix.length > 0 ? `${KEY_PREFIX}:${namespace}:${suffix}` : `${KEY_PREFIX}:${namespace}`;
}

/** Builds the name of the set that tracks keys invalidated together. */
export function buildCacheIndex(namespace: string, ...parts: readonly (string | number | null | undefined)[]): string {
  const suffix = parts.map((part) => (part === null || part === undefined ? "-" : String(part))).join(":");

  return suffix.length > 0 ? `${INDEX_PREFIX}:${namespace}:${suffix}` : `${INDEX_PREFIX}:${namespace}`;
}

interface ReadThroughOptions<T> {
  /** Set this key belongs to, so a mutation can drop it. */
  index: string;
  key: string;
  load: () => Promise<T>;
  ttlSeconds: number;
}

export async function readThrough<T>(options: ReadThroughOptions<T>): Promise<T> {
  // Without Redis every read is a miss, which is a path this module already
  // supports on every request — the cache was never load-bearing.
  if (redis === null) {
    return options.load();
  }

  try {
    const cached = await redis.get(options.key);

    if (cached !== null) {
      return deserialiseCacheValue<T>(cached);
    }
  } catch (error) {
    logger.warn({ err: error, key: options.key }, "Cache read failed; falling through to the source");
  }

  const value = await options.load();

  try {
    await redis
      .multi()
      .set(options.key, serialiseCacheValue(value), "EX", options.ttlSeconds)
      .sadd(options.index, options.key)
      .expire(options.index, INDEX_TTL_SECONDS)
      .exec();
  } catch (error) {
    logger.warn({ err: error, key: options.key }, "Cache write failed; the value was still served");
  }

  return value;
}

/** Drops every key recorded under these indexes. Safe to call for unknown indexes. */
export async function invalidateCacheIndex(...indexes: readonly string[]): Promise<void> {
  if (redis === null || indexes.length === 0) {
    return;
  }

  try {
    for (const index of indexes) {
      const keys = await redis.smembers(index);

      if (keys.length > 0) {
        await redis.del(...keys);
      }

      await redis.del(index);
    }
  } catch (error) {
    logger.warn({ err: error, indexes }, "Cache invalidation failed; entries will expire on their TTL");
  }
}
