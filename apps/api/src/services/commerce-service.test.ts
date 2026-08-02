import { describe, expect, test } from "bun:test";

import type { CourseRepository } from "@/repositories/course-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type { PaymentRecord, PaymentRepository } from "@/repositories/payment-repository";
import type { ProfileRepository } from "@/repositories/profile-repository";
import type { ReviewRepository } from "@/repositories/review-repository";
import { CommerceService } from "@/services/commerce-service";
import type { SslCommerzService } from "@/services/sslcommerz-service";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

/**
 * Characterisation tests: these pin the behaviour that exists today, before the
 * ADR-0001 rework moves enrolment creation onto the payment-success path. They
 * are expected to change in Stage 1 — that is the point. A diff here means the
 * behaviour moved, and the diff should match the ADR.
 */

interface Overrides {
  course?: Partial<CourseShape> | null;
  enrollment?: { id: string; status: string } | null;
  hasAccess?: boolean;
  payment?: Partial<PaymentRecord> | null;
  profile?: { email: string; name: string } | null;
  validation?: { status: string; transactionId: string; validationId: string };
}

interface CourseShape {
  id: string;
  price: string;
  status: string;
  title: string;
}

interface Calls {
  createdEnrollments: number;
  createdPayments: number;
  updates: { id: string; patch: Record<string, unknown> }[];
}

function buildService(overrides: Overrides = {}): { calls: Calls; service: CommerceService } {
  const calls: Calls = { createdEnrollments: 0, createdPayments: 0, updates: [] };

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
    transactionId: "MMA-TXN-1",
    userId: "user-1",
    ...overrides.payment
  } as unknown as PaymentRecord;

  const enrollmentRepository = {
    create: async () => {
      calls.createdEnrollments += 1;

      return { id: "enrol-new", status: "ACTIVE" };
    },
    findById: async () => ({ courseId: "course-1", id: "enrol-1" }),
    findByUserAndCourse: async () => overrides.enrollment ?? null,
    hasCourseAccess: async () => overrides.hasAccess ?? false
  } as unknown as EnrollmentRepository;

  const paymentRepository = {
    create: async () => {
      calls.createdPayments += 1;

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
    validatePayment: async () =>
      overrides.validation ?? {
        metadata: {},
        status: "VALID",
        transactionId: "MMA-TXN-1",
        validationId: "VAL-1"
      }
  } as unknown as SslCommerzService;

  const reviewRepository = {
    findByUserAndCourse: async () => null
  } as unknown as ReviewRepository;

  return {
    calls,
    service: new CommerceService(
      enrollmentRepository,
      paymentRepository,
      courseRepository,
      profileRepository,
      sslCommerzService,
      reviewRepository
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
    expect(calls.createdEnrollments).toBe(1);
    expect(calls.createdPayments).toBe(0);
  });

  test("CURRENT BEHAVIOUR: a priced course creates the enrolment before any payment", async () => {
    // ADR-0001 moves this creation to the payment-success handler. When Stage 1
    // lands, createdEnrollments becomes 0 here and this expectation must flip.
    const { calls, service } = buildService({ course: { price: "500.00" } });
    const result = await service.createEnrollment("course-1", "user-1", "STUDENT");

    expect(calls.createdEnrollments).toBe(1);
    expect(calls.createdPayments).toBe(1);
    expect(result.accessGranted).toBe(false);
    expect(result.requiresPayment).toBe(true);
    expect(result.payment?.gatewayUrl).toBe("https://sandbox.sslcommerz.com/pay/abc");
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
    expect(calls.createdEnrollments).toBe(0);
    expect(calls.createdPayments).toBe(0);
  });

  test("re-enrolling without access reuses the enrolment and starts a new payment", async () => {
    const { calls, service } = buildService({
      course: { price: "500.00" },
      enrollment: { id: "enrol-1", status: "ACTIVE" },
      hasAccess: false
    });
    const result = await service.createEnrollment("course-1", "user-1", "STUDENT");

    expect(calls.createdEnrollments).toBe(0);
    expect(calls.createdPayments).toBe(1);
    expect(result.enrollmentId).toBe("enrol-1");
  });

  test("a priced course requires a profile", async () => {
    const { service } = buildService({ course: { price: "500.00" }, profile: null });

    await expect(service.createEnrollment("course-1", "user-1", "STUDENT")).rejects.toBeInstanceOf(
      NotFoundError
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

  test("a valid success marks the payment SUCCESS and stamps paidAt", async () => {
    const { calls, service } = buildService();
    const redirect = await service.handlePaymentCallback({ paymentId: "pay-1", status: "SUCCESS" });

    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0]?.patch.status).toBe("SUCCESS");
    expect(calls.updates[0]?.patch.paidAt).toBeInstanceOf(Date);
    expect(redirect).toContain("status=success");
  });

  test("GAP: a non-VALID gateway status still settles the payment", async () => {
    // handlePaymentCallback only compares transaction ids; it never asserts the
    // gateway's own validation status. Stage 1 must make this case throw.
    const { calls, service } = buildService({
      validation: { status: "INVALID_TRANSACTION", transactionId: "MMA-TXN-1", validationId: "VAL-1" }
    });

    const redirect = await service.handlePaymentCallback({ paymentId: "pay-1", status: "SUCCESS" });

    expect(calls.updates[0]?.patch.status).toBe("SUCCESS");
    expect(redirect).toContain("status=success");
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
    const redirect = await service.handlePaymentCallback({ paymentId: "pay-1", status: "CANCELLED" });

    expect(calls.updates[0]?.patch.status).toBe("FAILED");
    expect(
      (calls.updates[0]?.patch.metadata as Record<string, unknown> | undefined)?.lastCallbackStatus
    ).toBe("CANCELLED");
    expect(redirect).toContain("status=cancel");
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

  test("CURRENT BEHAVIOUR: refunding touches only the payment, never the enrolment", async () => {
    // ADR-0001 makes refund cancel the enrolment in the same transaction.
    // Today access is revoked only as a side effect of hasCourseAccess
    // matching on status = 'SUCCESS'. Stage 1 must make this explicit.
    const { calls, service } = buildService({
      payment: { status: "SUCCESS" } as Partial<PaymentRecord>
    });

    await service.refundPayment("pay-1", undefined, "ADMIN");

    const touchedEnrolment = calls.updates.some((update) => "cancelledAt" in update.patch);

    expect(touchedEnrolment).toBe(false);
  });
});
