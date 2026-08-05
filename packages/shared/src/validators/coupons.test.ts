import { describe, expect, test } from "bun:test";

import {
  couponCodeSchema,
  createCouponSchema,
  listCouponsQuerySchema,
  previewCouponSchema,
  updateCouponSchema
} from "./coupons";

const UUID = "11111111-1111-4111-8111-111111111111";

const baseCoupon = {
  code: "eid25",
  courseId: UUID,
  kind: "PERCENT" as const,
  value: 20
};

describe("couponCodeSchema", () => {
  test("uppercases, so a code typed in lower case finds the same coupon", () => {
    expect(couponCodeSchema.parse("  save20 ")).toBe("SAVE20");
  });

  test("refuses characters that do not survive being read off a poster", () => {
    expect(couponCodeSchema.safeParse("SAVE 20").success).toBe(false);
    expect(couponCodeSchema.safeParse("সেভ২০").success).toBe(false);
    expect(couponCodeSchema.safeParse("SA").success).toBe(false);
    expect(couponCodeSchema.safeParse("A".repeat(33)).success).toBe(false);
    expect(couponCodeSchema.safeParse("EID-25_B").success).toBe(true);
  });
});

describe("createCouponSchema", () => {
  test("a course id is optional — omitting it is the platform-wide case", () => {
    const parsed = createCouponSchema.parse({ code: "EID25", kind: "FLAT", value: 300 });

    expect(parsed.courseId).toBeUndefined();
    expect(createCouponSchema.parse({ ...baseCoupon, courseId: null }).courseId).toBeNull();
  });

  test("a percentage must land between 1 and 100", () => {
    expect(createCouponSchema.safeParse({ ...baseCoupon, value: 101 }).success).toBe(false);
    expect(createCouponSchema.safeParse({ ...baseCoupon, value: 0.5 }).success).toBe(false);
    expect(createCouponSchema.safeParse({ ...baseCoupon, value: 100 }).success).toBe(true);
  });

  test("a flat amount is not capped at 100 — that limit belongs to percentages", () => {
    expect(createCouponSchema.safeParse({ ...baseCoupon, kind: "FLAT", value: 2000 }).success).toBe(
      true
    );
  });

  test("a discount of zero is not a discount", () => {
    expect(createCouponSchema.safeParse({ ...baseCoupon, kind: "FLAT", value: 0 }).success).toBe(
      false
    );
  });

  test("a window that ends before it starts is refused", () => {
    expect(
      createCouponSchema.safeParse({
        ...baseCoupon,
        expiresAt: "2026-08-01T00:00:00.000Z",
        startsAt: "2026-09-01T00:00:00.000Z"
      }).success
    ).toBe(false);
    expect(
      createCouponSchema.safeParse({
        ...baseCoupon,
        expiresAt: "2026-09-01T00:00:00.000Z",
        startsAt: "2026-08-01T00:00:00.000Z"
      }).success
    ).toBe(true);
  });

  test("the cap is optional, and null means uncapped", () => {
    expect(createCouponSchema.parse(baseCoupon).maxRedemptions).toBeUndefined();
    expect(createCouponSchema.parse({ ...baseCoupon, maxRedemptions: null }).maxRedemptions).toBe(
      null
    );
    expect(createCouponSchema.safeParse({ ...baseCoupon, maxRedemptions: 0 }).success).toBe(false);
  });

  test("defaults leave a coupon on and unadvertised", () => {
    const parsed = createCouponSchema.parse(baseCoupon);

    expect(parsed.isDisabled).toBe(false);
    expect(parsed.isPublic).toBe(false);
  });
});

describe("updateCouponSchema", () => {
  test("patching one field does not carry the create defaults with it", () => {
    const parsed = updateCouponSchema.parse({ code: "EID26" });

    // `.partial()` does not strip a `.default()`, which is why this schema is
    // derived from the field shapes. isPublic arriving as false here would pull
    // a coupon off the course page nobody asked to change.
    expect(parsed).toEqual({ code: "EID26" });
  });

  test("an empty patch changes nothing and is refused", () => {
    expect(updateCouponSchema.safeParse({}).success).toBe(false);
  });

  test("the percentage rule still applies when both fields are sent", () => {
    expect(updateCouponSchema.safeParse({ kind: "PERCENT", value: 150 }).success).toBe(false);
    expect(updateCouponSchema.safeParse({ kind: "FLAT", value: 150 }).success).toBe(true);
  });

  test("a lone value cannot be checked against a kind it was not sent with", () => {
    expect(updateCouponSchema.safeParse({ value: 150 }).success).toBe(true);
  });
});

describe("listCouponsQuerySchema", () => {
  test("defaults to twenty on page one", () => {
    expect(listCouponsQuerySchema.parse({})).toMatchObject({ limit: 20, page: 1 });
  });

  test("the read-only flag reads the word, not the truthiness of the string", () => {
    expect(listCouponsQuerySchema.parse({ othersOnCourses: "false" }).othersOnCourses).toBe(false);
    expect(listCouponsQuerySchema.parse({ othersOnCourses: "true" }).othersOnCourses).toBe(true);
  });

  test("only filters by a derived state the list can actually show", () => {
    expect(listCouponsQuerySchema.safeParse({ state: "EXHAUSTED" }).success).toBe(true);
    expect(listCouponsQuerySchema.safeParse({ state: "USED_UP" }).success).toBe(false);
  });
});

describe("previewCouponSchema", () => {
  test("needs both a course and a code, and uppercases the code", () => {
    expect(previewCouponSchema.parse({ code: "eid25", courseId: UUID })).toEqual({
      code: "EID25",
      courseId: UUID
    });
    expect(previewCouponSchema.safeParse({ code: "EID25" }).success).toBe(false);
  });
});
