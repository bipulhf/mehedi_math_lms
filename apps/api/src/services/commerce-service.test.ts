import { describe, expect, test } from "bun:test";

import type { CourseRepository } from "@/repositories/course-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type { PaymentRecord, PaymentRepository } from "@/repositories/payment-repository";
import type { ProfileRepository } from "@/repositories/profile-repository";
import type { ReviewRepository } from "@/repositories/review-repository";
import { CommerceService } from "@/services/commerce-service";
import type { CouponService, ResolvedCoupon } from "@/services/coupon-service";
import type { NotificationService } from "@/services/notification-service";
import type { SslCommerzService } from "@/services/sslcommerz-service";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

/**
 * These pinned the pre-ADR-0001 behaviour and were updated when Stage 1 landed.
 * An enrolment now exists only once the money has cleared, refunding cancels it
 * explicitly, and settlement verifies the gateway's own verdict and the amount.
 */

interface Overrides {
  coupon?: ResolvedCoupon | null;
  course?: Partial<CourseShape> | null;
  enrollment?: { id: string; status: string } | null;
  hasAccess?: boolean;
  payment?: Partial<PaymentRecord> | null;
  profile?: { email: string; name: string } | null;
  validation?: {
    amount?: string | null;
    status: string;
    transactionId: string;
    validationId: string;
  };
}

interface CourseShape {
  id: string;
  price: string;
  status: string;
  title: string;
}

interface Calls {
  cancelledEnrollments: string[];
  createdEnrollments: number;
  createdPayments: number;
  grantedAccess: number;
  paymentInputs: Record<string, unknown>[];
  updates: { id: string; patch: Record<string, unknown> }[];
}

function buildService(overrides: Overrides = {}): { calls: Calls; service: CommerceService } {
  const calls: Calls = {
    cancelledEnrollments: [],
    createdEnrollments: 0,
    createdPayments: 0,
    grantedAccess: 0,
    paymentInputs: [],
    updates: []
  };

  const course: CourseShape | null =
    overrides.course === null
      ? null
      : {
          id: "course-1",
          price: "0.00",
          status: "PUBLISHED",
          title: "HSC Physics",
          ...overrides.course
        };

  const payment = {
    amount: "500.00",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    currency: "BDT",
    enrollmentId: "enrol-1",
    id: "pay-1",
    metadata: {},
    paidAt: null,
    refundedAt: null,
    status: "PENDING",
    transactionId: "GENEX-TXN-1",
    userId: "user-1",
    ...overrides.payment
  } as unknown as PaymentRecord;

  const enrollmentRepository = {
    cancelById: async (id: string) => {
      calls.cancelledEnrollments.push(id);

      return { cancelledAt: new Date(), id };
    },
    create: async () => {
      calls.createdEnrollments += 1;

      return { id: "enrol-new", status: "ACTIVE" };
    },
    findById: async () => ({ courseId: "course-1", id: "enrol-1" }),
    findByUserAndCourse: async () => overrides.enrollment ?? null,
    grantAccess: async () => {
      calls.grantedAccess += 1;

      return { cancelledAt: null, id: "enrol-new", status: "ACTIVE" };
    },
    hasCourseAccess: async () => overrides.hasAccess ?? false
  } as unknown as EnrollmentRepository;

  const paymentRepository = {
    create: async (input: Record<string, unknown>) => {
      calls.createdPayments += 1;
      calls.paymentInputs.push(input);

      return payment;
    },
    findById: async () => (overrides.payment === null ? null : payment),
    findByTransactionId: async () => (overrides.payment === null ? null : payment),
    findUserOwnedPayment: async () => (overrides.payment === null ? null : payment),
    update: async (id: string, patch: Record<string, unknown>) => {
      calls.updates.push({ id, patch });

      return { ...payment, ...patch } as PaymentRecord;
    }
  } as unknown as PaymentRepository;

  const courseRepository = {
    findById: async () => course
  } as unknown as CourseRepository;

  const profileRepository = {
    findByUserId: async () =>
      overrides.profile === null
        ? null
        : { email: "student@example.com", name: "Student", ...overrides.profile }
  } as unknown as ProfileRepository;

  const sslCommerzService = {
    buildFailureCallbackUrl: () => "https://app.test/fail",
    buildSuccessCallbackUrl: () => "https://app.test/success",
    initiatePayment: async () => ({
      gatewayUrl: "https://sandbox.sslcommerz.com/pay/abc",
      isMock: true,
      metadata: {}
    }),
    validatePayment: async () => ({
      amount: null,
      metadata: {},
      status: "VALID",
      transactionId: "GENEX-TXN-1",
      validationId: "VAL-1",
      ...overrides.validation
    })
  } as unknown as SslCommerzService;

  const reviewRepository = {
    findByUserAndCourse: async () => null
  } as unknown as ReviewRepository;

  const notificationService = {
    notifyUsers: async () => undefined
  } as unknown as NotificationService;

  const couponService = {
    resolveForCheckout: async () => {
      if (!overrides.coupon) {
        throw new ValidationError("This coupon cannot be used", [
          { field: "couponCode", message: "NOT_FOUND" }
        ]);
      }

      return overrides.coupon;
    }
  } as unknown as CouponService;

  return {
    calls,
    service: new CommerceService(
      enrollmentRepository,
      paymentRepository,
      courseRepository,
      profileRepository,
      sslCommerzService,
      reviewRepository,
      notificationService,
      couponService
    )
  };
}

describe("CommerceService.createEnrollment", () => {
  test("rejects a non-student", async () => {
    const { service } = buildService();

    await expect(service.createEnrollment("course-1", "user-1", "TEACHER")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  test("rejects a course that is not published", async () => {
    const { service } = buildService({ course: { status: "DRAFT" } });

    await expect(service.createEnrollment("course-1", "user-1", "STUDENT")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test("a free course grants access immediately and takes no payment", async () => {
    const { calls, service } = buildService({ course: { price: "0.00" } });
    const result = await service.createEnrollment("course-1", "user-1", "STUDENT");

    expect(result.accessGranted).toBe(true);
    expect(result.requiresPayment).toBe(false);
    expect(result.payment).toBeNull();
    expect(calls.grantedAccess).toBe(1);
    expect(calls.createdPayments).toBe(0);
  });

  test("a priced course creates NO enrolment until the money clears", async () => {
    // ADR-0001. The checkout lives entirely on the payment record.
    const { calls, service } = buildService({ course: { price: "500.00" } });
    const result = await service.createEnrollment("course-1", "user-1", "STUDENT");

    expect(calls.grantedAccess).toBe(0);
    expect(calls.createdEnrollments).toBe(0);
    expect(result.enrollmentId).toBeNull();
    expect(calls.createdPayments).toBe(1);
    expect(result.accessGranted).toBe(false);
    expect(result.requiresPayment).toBe(true);
    expect(result.payment?.gatewayUrl).toBe("https://sandbox.sslcommerz.com/pay/abc");
  });

  test("a coupon prices the payment, and the discount is recorded on it", async () => {
    const { calls, service } = buildService({
      coupon: {
        coupon: { code: "EID25", id: "coupon-1" },
        pricing: { discountAmount: "299.80", listAmount: "1499.00", payable: "1199.20" }
      } as unknown as ResolvedCoupon,
      course: { price: "1499.00" }
    });
    const result = await service.createEnrollment("course-1", "user-1", "STUDENT", {}, "EID25");

    expect(result.requiresPayment).toBe(true);
    // The Payable, not the list price -- and the ledger keeps both. ADR-0013.
    expect(calls.paymentInputs[0]).toMatchObject({
      amount: "1199.20",
      couponCode: "EID25",
      couponId: "coupon-1",
      discountAmount: "299.80",
      listAmount: "1499.00"
    });
  });

  test("a coupon that reaches zero skips the gateway and settles on the spot", async () => {
    const { calls, service } = buildService({
      coupon: {
        coupon: { code: "FREE100", id: "coupon-2" },
        pricing: { discountAmount: "1499.00", listAmount: "1499.00", payable: "0.00" }
      } as unknown as ResolvedCoupon,
      course: { price: "1499.00" }
    });
    const result = await service.createEnrollment("course-1", "user-1", "STUDENT", {}, "FREE100");

    expect(result.accessGranted).toBe(true);
    expect(result.requiresPayment).toBe(false);
    expect(result.payment).toBeNull();
    expect(calls.grantedAccess).toBe(1);
    // A row is still written, so the redemption counts and accounting sees it.
    expect(calls.paymentInputs[0]).toMatchObject({
      amount: "0.00",
      couponId: "coupon-2",
      provider: "COUPON",
      status: "SUCCESS"
    });
  });

  test("a coupon the service refuses stops the checkout before any payment", async () => {
    const { calls, service } = buildService({ coupon: null, course: { price: "1499.00" } });

    await expect(
      service.createEnrollment("course-1", "user-1", "STUDENT", {}, "NOPE")
    ).rejects.toBeInstanceOf(ValidationError);
    expect(calls.createdPayments).toBe(0);
  });

  test("an existing enrolment with access short-circuits without a new payment", async () => {
    const { calls, service } = buildService({
      course: { price: "500.00" },
      enrollment: { id: "enrol-1", status: "ACTIVE" },
      hasAccess: true
    });
    const result = await service.createEnrollment("course-1", "user-1", "STUDENT");

    expect(result.accessGranted).toBe(true);
    expect(result.enrollmentId).toBe("enrol-1");
    expect(calls.grantedAccess).toBe(0);
    expect(calls.createdPayments).toBe(0);
  });

  test("re-enrolling without access reuses the enrolment and starts a new payment", async () => {
    const { calls, service } = buildService({
      course: { price: "500.00" },
      enrollment: { id: "enrol-1", status: "ACTIVE" },
      hasAccess: false
    });
    const result = await service.createEnrollment("course-1", "user-1", "STUDENT");

    expect(calls.grantedAccess).toBe(0);
    expect(calls.createdPayments).toBe(1);
    expect(result.enrollmentId).toBe("enrol-1");
  });

  test("a priced course requires a profile", async () => {
    const { service } = buildService({ course: { price: "500.00" }, profile: null });

    await expect(service.createEnrollment("course-1", "user-1", "STUDENT")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test("the caller's return target is stored on the payment, not left to the callback", async () => {
    // The gateway calls back minutes later carrying only its own parameters, so
    // where to send the browser afterwards has to survive on the record.
    const { calls, service } = buildService({ course: { price: "500.00" } });

    await service.createEnrollment("course-1", "user-1", "STUDENT", {
      origin: "http://192.168.0.9:3000",
      path: "/api/payment-return?redirect=genex%3A%2F%2Fpayment-callback"
    });

    const metadata = calls.updates[0]?.patch.metadata as Record<string, unknown> | undefined;

    expect(metadata?.callbackOrigin).toBe("http://192.168.0.9:3000");
    expect(metadata?.callbackPath).toBe(
      "/api/payment-return?redirect=genex%3A%2F%2Fpayment-callback"
    );
  });
});

describe("CommerceService.handlePaymentCallback", () => {
  test("an unknown payment is rejected", async () => {
    const { service } = buildService({ payment: null });

    await expect(
      service.handlePaymentCallback({ paymentId: "missing", status: "SUCCESS" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("a transaction id mismatch is rejected and nothing settles", async () => {
    const { calls, service } = buildService({
      validation: { status: "VALID", transactionId: "SOMEONE-ELSE", validationId: "VAL-9" }
    });

    await expect(
      service.handlePaymentCallback({ paymentId: "pay-1", status: "SUCCESS" })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(calls.updates).toHaveLength(0);
  });

  test("a valid success settles the payment and creates the enrolment", async () => {
    const { calls, service } = buildService();
    const redirect = await service.handlePaymentCallback({ paymentId: "pay-1", status: "SUCCESS" });

    expect(calls.grantedAccess).toBe(1);
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0]?.patch.status).toBe("SUCCESS");
    expect(calls.updates[0]?.patch.paidAt).toBeInstanceOf(Date);
    expect(calls.updates[0]?.patch.enrollmentId).toBe("enrol-new");
    expect(redirect).toContain("status=success");
  });

  test("a non-VALID gateway status is refused and nothing settles", async () => {
    // ADR-0001. Previously only the transaction id was compared, so a response
    // of INVALID_TRANSACTION carrying a matching tran_id still settled.
    const { calls, service } = buildService({
      validation: {
        status: "INVALID_TRANSACTION",
        transactionId: "GENEX-TXN-1",
        validationId: "VAL-1"
      }
    });

    await expect(
      service.handlePaymentCallback({ paymentId: "pay-1", status: "SUCCESS" })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(calls.grantedAccess).toBe(0);
    expect(calls.updates).toHaveLength(0);
  });

  test("an underpaid amount is refused and nothing settles", async () => {
    // ADR-0001. The gateway reports what was actually paid; it must cover the
    // course price before the enrolment is granted.
    const { calls, service } = buildService({
      validation: {
        amount: "1.00",
        status: "VALID",
        transactionId: "GENEX-TXN-1",
        validationId: "VAL-1"
      }
    });

    await expect(
      service.handlePaymentCallback({ paymentId: "pay-1", status: "SUCCESS" })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(calls.grantedAccess).toBe(0);
    expect(calls.updates).toHaveLength(0);
  });

  test("a failure marks the payment FAILED", async () => {
    const { calls, service } = buildService();
    const redirect = await service.handlePaymentCallback({ paymentId: "pay-1", status: "FAILED" });

    expect(calls.updates[0]?.patch.status).toBe("FAILED");
    expect(redirect).toContain("status=fail");
  });

  test("a cancellation also writes FAILED, keeping the distinction in metadata", async () => {
    // payment_status has no CANCELLED member (PENDING | SUCCESS | FAILED |
    // REFUNDED), so a cancelled checkout is stored as FAILED. The fact that the
    // user cancelled rather than failed survives only in metadata and the
    // redirect. This is deliberate, not a defect.
    const { calls, service } = buildService();
    const redirect = await service.handlePaymentCallback({
      paymentId: "pay-1",
      status: "CANCELLED"
    });

    expect(calls.updates[0]?.patch.status).toBe("FAILED");
    expect(
      (calls.updates[0]?.patch.metadata as Record<string, unknown> | undefined)?.lastCallbackStatus
    ).toBe("CANCELLED");
    expect(redirect).toContain("status=cancel");
  });

  test("the default return is the web dashboard page", async () => {
    const { service } = buildService();
    const redirect = await service.handlePaymentCallback({
      origin: "https://app.test",
      paymentId: "pay-1",
      status: "SUCCESS"
    });

    expect(redirect).toBe(
      "https://app.test/dashboard/payments/return?paymentId=pay-1&status=success"
    );
  });

  test("a stored callback path is honoured and keeps its own query string", async () => {
    // This is what makes the mobile return work: the app's deep link rides in
    // the path's query, and `paymentId` merges alongside rather than opening a
    // second `?`.
    const { service } = buildService({
      payment: {
        metadata: {
          callbackOrigin: "http://192.168.0.9:3000",
          callbackPath: "/api/payment-return?redirect=genex%3A%2F%2Fpayment-callback"
        }
      } as Partial<PaymentRecord>
    });
    const redirect = await service.handlePaymentCallback({ paymentId: "pay-1", status: "SUCCESS" });
    const url = new URL(redirect);

    expect(url.origin).toBe("http://192.168.0.9:3000");
    expect(url.pathname).toBe("/api/payment-return");
    expect(url.searchParams.get("redirect")).toBe("genex://payment-callback");
    expect(url.searchParams.get("paymentId")).toBe("pay-1");
    expect(url.searchParams.get("status")).toBe("success");
  });

  test("the path is read from the payment even when the callback echoes an origin", async () => {
    // `origin` round-trips through the gateway and is therefore attacker-shaped.
    // The path never leaves the server, so a caller cannot swap the destination
    // of someone else's settled payment.
    const { service } = buildService({
      payment: {
        metadata: { callbackPath: "/api/payment-return" }
      } as Partial<PaymentRecord>
    });
    const redirect = await service.handlePaymentCallback({
      origin: "https://app.test",
      paymentId: "pay-1",
      status: "FAILED"
    });

    expect(redirect).toBe("https://app.test/api/payment-return?paymentId=pay-1&status=fail");
  });
});

describe("CommerceService.refundPayment", () => {
  test("a student cannot refund", async () => {
    const { service } = buildService({ payment: { status: "SUCCESS" } as Partial<PaymentRecord> });

    await expect(service.refundPayment("pay-1", undefined, "STUDENT")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  test("a teacher cannot refund", async () => {
    const { service } = buildService({ payment: { status: "SUCCESS" } as Partial<PaymentRecord> });

    await expect(service.refundPayment("pay-1", undefined, "TEACHER")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  test("only a successful payment can be refunded", async () => {
    const { service } = buildService({ payment: { status: "PENDING" } as Partial<PaymentRecord> });

    await expect(service.refundPayment("pay-1", undefined, "ACCOUNTANT")).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  test("an accountant refund sets REFUNDED and stamps refundedAt", async () => {
    const { calls, service } = buildService({
      payment: { status: "SUCCESS" } as Partial<PaymentRecord>
    });

    await service.refundPayment("pay-1", "duplicate charge", "ACCOUNTANT");

    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0]?.patch.status).toBe("REFUNDED");
    expect(calls.updates[0]?.patch.refundedAt).toBeInstanceOf(Date);
  });

  test("refunding cancels the enrolment it paid for", async () => {
    // ADR-0001. Previously access was revoked only as a side effect of
    // hasCourseAccess matching on status = 'SUCCESS'; now it is explicit.
    const { calls, service } = buildService({
      payment: { status: "SUCCESS" } as Partial<PaymentRecord>
    });

    await service.refundPayment("pay-1", undefined, "ADMIN");

    expect(calls.cancelledEnrollments).toEqual(["enrol-1"]);
  });

  test("refunding an unsettled payment cancels nothing", async () => {
    const { calls, service } = buildService({
      payment: { enrollmentId: null, status: "SUCCESS" } as Partial<PaymentRecord>
    });

    await service.refundPayment("pay-1", undefined, "ADMIN");

    expect(calls.cancelledEnrollments).toEqual([]);
  });
});
