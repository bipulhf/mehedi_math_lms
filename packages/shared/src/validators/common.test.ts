import { describe, expect, test } from "bun:test";

import { emailSchema, idSchema, nonEmptyStringSchema, paginationSchema } from "./common";

/**
 * These schemas are the shared contract: the API validates requests with them
 * and the web app resolves its forms against them. A loosened `.min()` or a
 * dropped `.uuid()` changes what the server accepts *and* what the client
 * blocks in one edit, so each rule gets a test that fails when it moves.
 */

describe("idSchema", () => {
  test("accepts a uuid", () => {
    expect(idSchema.parse("11111111-1111-4111-8111-111111111111")).toBe(
      "11111111-1111-4111-8111-111111111111"
    );
  });

  test("rejects anything that is not a uuid", () => {
    expect(idSchema.safeParse("42").success).toBe(false);
    expect(idSchema.safeParse("").success).toBe(false);
    expect(idSchema.safeParse("11111111-1111-4111-8111").success).toBe(false);
  });
});

describe("emailSchema", () => {
  test("accepts an address", () => {
    expect(emailSchema.parse("learner@example.com")).toBe("learner@example.com");
  });

  test("rejects a bare local part or a missing host", () => {
    expect(emailSchema.safeParse("learner").success).toBe(false);
    expect(emailSchema.safeParse("learner@").success).toBe(false);
  });
});

describe("nonEmptyStringSchema", () => {
  test("trims before measuring, so whitespace is not content", () => {
    expect(nonEmptyStringSchema.parse("  hello  ")).toBe("hello");
    expect(nonEmptyStringSchema.safeParse("   ").success).toBe(false);
  });
});

describe("paginationSchema", () => {
  test("defaults to the first page of ten", () => {
    expect(paginationSchema.parse({})).toEqual({ limit: 10, page: 1 });
  });

  test("caps the page size at 100", () => {
    expect(paginationSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  test("refuses a zero, negative or fractional page", () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: -1 }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });
});
