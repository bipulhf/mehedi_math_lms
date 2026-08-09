import { describe, expect, test } from "bun:test";

import {
  createEnrollmentSchema,
  paymentListQuerySchema,
  paymentStatusSchema,
  paymentValidationParamsSchema,
  refundPaymentSchema
} from "./payments";

const UUID = "11111111-1111-4111-8111-111111111111";

/**
 * The settlement path. These schemas sit between a checkout button and money
 * moving, so each rule is asserted rather than assumed.
 */

describe("paymentStatusSchema", () => {
  test("matches the database enum", () => {
    expect(paymentStatusSchema.options).toEqual(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]);
  });

  test("rejects a status the gateway might invent", () => {
    expect(paymentStatusSchema.safeParse("CANCELLED").success).toBe(false);
  });
});

describe("createEnrollmentSchema", () => {
  test("requires a course id that is a uuid", () => {
    expect(createEnrollmentSchema.parse({ courseId: UUID }).courseId).toBe(UUID);
    expect(createEnrollmentSchema.safeParse({ courseId: "algebra" }).success).toBe(false);
    expect(createEnrollmentSchema.safeParse({}).success).toBe(false);
  });

  test("the callback origin, when given, must be an absolute url", () => {
    expect(
      createEnrollmentSchema.safeParse({ callbackOrigin: "https://app.test", courseId: UUID })
        .success
    ).toBe(true);
    expect(
      createEnrollmentSchema.safeParse({ callbackOrigin: "/dashboard", courseId: UUID }).success
    ).toBe(false);
  });

  test("the callback path is a path on that origin, and cannot escape it", () => {
    expect(
      createEnrollmentSchema.safeParse({
        callbackPath: "/dashboard/payments/return",
        courseId: UUID
      }).success
    ).toBe(true);
    // The mobile app carries its deep link here, so a query string is allowed.
    expect(
      createEnrollmentSchema.safeParse({
        callbackPath: "/api/payment-return?redirect=mma%3A%2F%2Fpayment-callback",
        courseId: UUID
      }).success
    ).toBe(true);

    // An absolute URL would redirect the browser off the origin after payment.
    expect(
      createEnrollmentSchema.safeParse({ callbackPath: "https://evil.test/x", courseId: UUID })
        .success
    ).toBe(false);
    // So would a protocol-relative one, which `new URL()` resolves to a host.
    expect(
      createEnrollmentSchema.safeParse({ callbackPath: "//evil.test/x", courseId: UUID }).success
    ).toBe(false);
    expect(
      createEnrollmentSchema.safeParse({ callbackPath: "dashboard", courseId: UUID }).success
    ).toBe(false);
  });
});

describe("paymentValidationParamsSchema", () => {
  test("the gateway's validation id is a non-empty opaque string, not a uuid", () => {
    expect(paymentValidationParamsSchema.parse({ valId: "2504281234567ABCDE" }).valId).toBe(
      "2504281234567ABCDE"
    );
    expect(paymentValidationParamsSchema.safeParse({ valId: "" }).success).toBe(false);
    expect(paymentValidationParamsSchema.safeParse({ valId: "a".repeat(256) }).success).toBe(false);
  });
});

describe("paymentListQuerySchema", () => {
  test("defaults to twenty on page one and coerces query strings", () => {
    expect(paymentListQuerySchema.parse({})).toMatchObject({ limit: 20, page: 1 });
    expect(paymentListQuerySchema.parse({ limit: "50", page: "2" })).toMatchObject({
      limit: 50,
      page: 2
    });
  });

  test("caps the page size at a hundred", () => {
    expect(paymentListQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  test("only filters by a real payment status", () => {
    expect(paymentListQuerySchema.safeParse({ status: "REFUNDED" }).success).toBe(true);
    expect(paymentListQuerySchema.safeParse({ status: "refunded" }).success).toBe(false);
  });
});

describe("refundPaymentSchema", () => {
  test("remarks are optional and may be cleared with an empty string", () => {
    expect(refundPaymentSchema.safeParse({}).success).toBe(true);
    expect(refundPaymentSchema.safeParse({ remarks: "" }).success).toBe(true);
    expect(refundPaymentSchema.safeParse({ remarks: "a".repeat(4001) }).success).toBe(false);
  });
});
