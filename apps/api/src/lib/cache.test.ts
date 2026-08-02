import { describe, expect, test } from "bun:test";

import {
  buildCacheIndex,
  buildCacheKey,
  deserialiseCacheValue,
  serialiseCacheValue
} from "@/lib/cache";

/**
 * The cache stores repository records, and those carry `Date` fields that the
 * service mappers call `.toISOString()` on. A plain JSON round-trip returns
 * strings, so the first cache hit would throw. That is the bug these tests
 * exist to prevent.
 */

describe("cache value serialisation", () => {
  test("a Date survives the round trip as a Date", () => {
    const value = { createdAt: new Date("2026-01-01T10:30:00.000Z"), id: "comment-1" };
    const restored = deserialiseCacheValue<typeof value>(serialiseCacheValue(value));

    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(restored.createdAt.toISOString()).toBe("2026-01-01T10:30:00.000Z");
  });

  test("nested and nullable dates are handled too", () => {
    const value = {
      items: [{ publishedAt: null, updatedAt: new Date("2026-02-02T00:00:00.000Z") }],
      total: 1
    };
    const restored = deserialiseCacheValue<typeof value>(serialiseCacheValue(value));

    expect(restored.items[0]?.updatedAt).toBeInstanceOf(Date);
    expect(restored.items[0]?.publishedAt).toBeNull();
    expect(restored.total).toBe(1);
  });

  test("ordinary values are untouched", () => {
    const value = { flag: false, name: "Algebra", price: "1200.00", tags: ["a", "b"] };

    expect(deserialiseCacheValue<typeof value>(serialiseCacheValue(value))).toEqual(value);
  });
});

describe("cache key construction", () => {
  test("keys are namespaced and colon-delimited", () => {
    expect(buildCacheKey("comments", "lecture", "abc", 2, 20)).toBe("cache:comments:lecture:abc:2:20");
  });

  test("an absent filter is a distinct part, not an empty one", () => {
    // Otherwise "no category, page 2" and "category X, no page" could collide.
    expect(buildCacheKey("courses", "catalogue", undefined, 2)).toBe("cache:courses:catalogue:-:2");
  });

  test("indexes live under their own prefix so they are never mistaken for values", () => {
    expect(buildCacheIndex("comments", "lecture", "abc")).toBe("cache:index:comments:lecture:abc");
    expect(buildCacheIndex("categories")).toBe("cache:index:categories");
  });
});
