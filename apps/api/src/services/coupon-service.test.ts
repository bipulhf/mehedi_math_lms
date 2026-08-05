import { describe, expect, test } from "bun:test";

import type { CourseRecord, CourseRepository } from "@/repositories/course-repository";
import type { CouponRecord, CouponRepository } from "@/repositories/coupon-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import { priceWithCoupon } from "@/services/coupon-pricing";
import { CouponService } from "@/services/coupon-service";
import { ConflictError, ForbiddenError } from "@/utils/errors";

/**
 * Coupons under ADR-0013. The Payable is priced here, once, and everything
 * downstream — the buy card, the gateway, the ledger — is measured against it.
 */

const COURSE_ID = "course-1";

function buildCoupon(overrides: Partial<CouponRecord> = {}): CouponRecord {
  return {
    code: "EID25",
    courseId: COURSE_ID,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    createdById: "teacher-1",
    expiresAt: null,
    id: "coupon-1",
    isDisabled: false,
    isPublic: false,
    kind: "PERCENT",
    maxRedemptions: null,
    startsAt: null,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    value: "20.00",
    ...overrides
  };
}

interface Overrides {
  coupon?: CouponRecord | null;
  hasAccess?: boolean;
  ownedCourseIds?: readonly string[];
  paymentsReferencing?: number;
  price?: string;
  redemptions?: number;
  redemptionsByUser?: number;
  status?: CourseRecord["status"];
  teachers?: readonly { id: string; role: "OWNER" | "TEACHER" }[];
}

interface Calls {
  created: unknown[];
  deleted: string[];
}

function buildService(overrides: Overrides = {}): { calls: Calls; service: CouponService } {
  const calls: Calls = { created: [], deleted: [] };
  const coupon = overrides.coupon === undefined ? buildCoupon() : overrides.coupon;

  const couponRepository = {
    countPaymentsReferencing: async () => overrides.paymentsReferencing ?? 0,
    countRedemptions: async () => overrides.redemptions ?? 0,
    countRedemptionsByUser: async () => overrides.redemptionsByUser ?? 0,
    create: async (input: unknown) => {
      calls.created.push(input);

      return buildCoupon();
    },
    delete: async (id: string) => {
      calls.deleted.push(id);
    },
    findByCodeForCourse: async () => coupon,
    findByCodeInScope: async () => null,
    findById: async () => coupon,
    findListRecordById: async () =>
      coupon
        ? {
            ...coupon,
            courseSlug: "a-course",
            courseTitle: "A course",
            createdByName: "Teacher One",
            createdByRole: "TEACHER",
            redemptionCount: overrides.redemptions ?? 0,
            totalDiscount: "0"
          }
        : null
  } as unknown as CouponRepository;

  const courseRepository = {
    findById: async () =>
      ({
        id: COURSE_ID,
        price: overrides.price ?? "1499.00",
        status: overrides.status ?? "PUBLISHED",
        teachers: overrides.teachers ?? [{ id: "teacher-1", role: "OWNER" }]
      }) as unknown as CourseRecord,
    getOwnedCourseIds: async () => overrides.ownedCourseIds ?? [COURSE_ID]
  } as unknown as CourseRepository;

  const enrollmentRepository = {
    hasCourseAccess: async () => overrides.hasAccess ?? false
  } as unknown as EnrollmentRepository;

  return {
    calls,
    service: new CouponService(couponRepository, courseRepository, enrollmentRepository)
  };
}

describe("priceWithCoupon", () => {
  test("a percentage keeps its paisa", () => {
    expect(priceWithCoupon("1499.00", "PERCENT", "20.00")).toEqual({
      discountAmount: "299.80",
      listAmount: "1499.00",
      payable: "1199.20"
    });
  });

  test("a flat amount larger than the price discounts the price, not more", () => {
    expect(priceWithCoupon("1499.00", "FLAT", "2000.00")).toEqual({
      discountAmount: "1499.00",
      listAmount: "1499.00",
      payable: "0.00"
    });
  });

  test("a hundred percent reaches zero exactly", () => {
    expect(priceWithCoupon("1499.00", "PERCENT", "100.00").payable).toBe("0.00");
  });

  test("rounds a fractional percentage to paisa rather than carrying it", () => {
    expect(priceWithCoupon("999.00", "PERCENT", "33.00").discountAmount).toBe("329.67");
  });
});

describe("CouponService.preview", () => {
  test("prices a valid code and says so", async () => {
    const { service } = buildService();
    const result = await service.preview(COURSE_ID, "EID25", "student-1");

    expect(result.status).toBe("APPLIED");
    expect(result.pricing?.payable).toBe("1199.20");
    expect(result.reason).toBeNull();
  });

  test("refuses with a reason rather than an error, so the client can say it in Bangla", async () => {
    const { service } = buildService({ coupon: null });

    expect((await service.preview(COURSE_ID, "NOPE", "student-1")).reason).toBe("NOT_FOUND");
  });

  test("a disabled coupon is refused before its dates are considered", async () => {
    const { service } = buildService({ coupon: buildCoupon({ isDisabled: true }) });

    expect((await service.preview(COURSE_ID, "EID25", "student-1")).reason).toBe("DISABLED");
  });

  test("a window that has not opened, and one that has closed", async () => {
    const scheduled = buildService({
      coupon: buildCoupon({ startsAt: new Date(Date.now() + 86_400_000) })
    });

    expect((await scheduled.service.preview(COURSE_ID, "EID25", "student-1")).reason).toBe(
      "NOT_STARTED"
    );

    const expired = buildService({
      coupon: buildCoupon({ expiresAt: new Date(Date.now() - 1000) })
    });

    expect((await expired.service.preview(COURSE_ID, "EID25", "student-1")).reason).toBe("EXPIRED");
  });

  test("the cap is reached, not merely approached", async () => {
    const atCap = buildService({
      coupon: buildCoupon({ maxRedemptions: 100 }),
      redemptions: 100
    });

    expect((await atCap.service.preview(COURSE_ID, "EID25", "student-1")).reason).toBe("EXHAUSTED");

    const underCap = buildService({
      coupon: buildCoupon({ maxRedemptions: 100 }),
      redemptions: 99
    });

    expect((await underCap.service.preview(COURSE_ID, "EID25", "student-1")).status).toBe(
      "APPLIED"
    );
  });

  test("a student who already redeemed it is refused, refund or no refund", async () => {
    const { service } = buildService({ redemptionsByUser: 1 });

    expect((await service.preview(COURSE_ID, "EID25", "student-1")).reason).toBe("ALREADY_USED");
  });

  test("a student who already has the course has nothing to discount", async () => {
    const { service } = buildService({ hasAccess: true });

    expect((await service.preview(COURSE_ID, "EID25", "student-1")).reason).toBe(
      "ALREADY_ENROLLED"
    );
  });

  test("a free course refuses a coupon before looking one up", async () => {
    const { service } = buildService({ price: "0.00" });

    expect((await service.preview(COURSE_ID, "EID25", "student-1")).reason).toBe("FREE_COURSE");
  });

  test("an unpublished course is not a place to spend a coupon", async () => {
    const { service } = buildService({ status: "DRAFT" });

    expect((await service.preview(COURSE_ID, "EID25", "student-1")).reason).toBe(
      "COURSE_UNAVAILABLE"
    );
  });
});

describe("CouponService.resolveForCheckout", () => {
  test("throws where the preview would have answered politely", async () => {
    const { service } = buildService({ coupon: null });

    expect(service.resolveForCheckout(COURSE_ID, "NOPE", "student-1")).rejects.toThrow(
      "This coupon cannot be used"
    );
  });

  test("returns the coupon and the price it was resolved at", async () => {
    const { service } = buildService();
    const resolved = await service.resolveForCheckout(COURSE_ID, "EID25", "student-1");

    expect(resolved.coupon.id).toBe("coupon-1");
    expect(resolved.pricing.payable).toBe("1199.20");
  });
});

describe("CouponService.create", () => {
  test("a teacher may aim one at a course they own", async () => {
    const { calls, service } = buildService();

    await service.create(
      {
        code: "eid25",
        courseId: COURSE_ID,
        isDisabled: false,
        isPublic: false,
        kind: "FLAT",
        value: 300
      },
      { id: "teacher-1", role: "TEACHER" }
    );

    expect(calls.created[0]).toMatchObject({ code: "EID25", value: "300.00" });
  });

  test("a teacher who only works on the course cannot — price is the owner's", async () => {
    const { service } = buildService({ teachers: [{ id: "teacher-1", role: "TEACHER" }] });

    expect(
      service.create(
        {
          code: "EID25",
          courseId: COURSE_ID,
          isDisabled: false,
          isPublic: false,
          kind: "FLAT",
          value: 300
        },
        { id: "teacher-1", role: "TEACHER" }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("only an admin may make one that covers every course", async () => {
    const { service } = buildService();

    expect(
      service.create(
        { code: "EID25", courseId: null, isDisabled: false, isPublic: false, kind: "FLAT", value: 300 },
        { id: "teacher-1", role: "TEACHER" }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("an accountant may read coupons but not make one", async () => {
    const { service } = buildService();

    expect(
      service.create(
        {
          code: "EID25",
          courseId: COURSE_ID,
          isDisabled: false,
          isPublic: false,
          kind: "FLAT",
          value: 300
        },
        { id: "accountant-1", role: "ACCOUNTANT" }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("CouponService.remove", () => {
  test("a coupon nobody used can be deleted", async () => {
    const { calls, service } = buildService();

    await service.remove("coupon-1", { id: "teacher-1", role: "TEACHER" });

    expect(calls.deleted).toEqual(["coupon-1"]);
  });

  test("a coupon a payment names can only be disabled", async () => {
    const { service } = buildService({ paymentsReferencing: 1 });

    expect(service.remove("coupon-1", { id: "teacher-1", role: "TEACHER" })).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  test("a teacher cannot delete somebody else's coupon", async () => {
    const { service } = buildService({ coupon: buildCoupon({ createdById: "teacher-2" }) });

    expect(service.remove("coupon-1", { id: "teacher-1", role: "TEACHER" })).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });
});

describe("CouponService.getById", () => {
  test("a teacher may read an admin coupon that lands on a course they own", async () => {
    const { service } = buildService({ coupon: buildCoupon({ createdById: "admin-1" }) });
    const item = await service.getById("coupon-1", { id: "teacher-1", role: "TEACHER" });

    // Readable, but not theirs to change.
    expect(item.isEditable).toBe(false);
  });

  test("a teacher may not read a coupon aimed at somebody else's course", async () => {
    const { service } = buildService({
      coupon: buildCoupon({ courseId: "course-2", createdById: "teacher-2" }),
      ownedCourseIds: [COURSE_ID]
    });

    expect(
      service.getById("coupon-1", { id: "teacher-1", role: "TEACHER" })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
