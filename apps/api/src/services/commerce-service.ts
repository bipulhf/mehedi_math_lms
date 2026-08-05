import type { UserRole } from "@genex/shared";

import { env } from "@/lib/env";
import type { CourseRepository } from "@/repositories/course-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import { type StudentEnrollmentRecord } from "@/repositories/enrollment-repository";
import type { PaymentRepository } from "@/repositories/payment-repository";
import {
  type PaymentDashboardStatsRecord,
  type PaymentListRecord,
  type PaymentRecord
} from "@/repositories/payment-repository";
import type { ProfileRepository } from "@/repositories/profile-repository";
import type { ReviewRepository } from "@/repositories/review-repository";
import type { CouponService } from "@/services/coupon-service";
import type { NotificationService } from "@/services/notification-service";
import type { SslCommerzService } from "@/services/sslcommerz-service";
import { isSettledValidationStatus } from "@/services/sslcommerz-service";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface EnrollmentActionResponse {
  accessGranted: boolean;
  /**
   * Null while a priced course is still at checkout — the enrolment does not
   * exist until the payment settles. ADR-0001.
   */
  enrollmentId: string | null;
  payment: {
    gatewayUrl: string;
    id: string;
    isMock: boolean;
    status: PaymentRecord["status"];
    transactionId: string;
  } | null;
  requiresPayment: boolean;
}

export interface StudentEnrollmentItem {
  accessGranted: boolean;
  /** Set when a refund withdrew access. Independent of status. ADR-0001. */
  cancelledAt: string | null;
  category: {
    name: string;
    slug: string;
  };
  completedAt: string | null;
  course: {
    coverImageUrl: string | null;
    id: string;
    price: string;
    slug: string;
    status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
    title: string;
  };
  enrolledAt: string;
  hasReview: boolean;
  id: string;
  latestPaymentStatus: PaymentRecord["status"] | null;
  progressPercentage: number;
  status: "ACTIVE" | "COMPLETED";
}

type FormattedEnrollment = Omit<StudentEnrollmentItem, "hasReview">;

export interface PaymentHistoryItem {
  /** The Payable — what was actually charged, after any coupon. */
  amount: string;
  /** The code as typed, when a coupon was used. ADR-0013. */
  couponCode: string | null;
  course: {
    id: string;
    title: string;
  };
  createdAt: string;
  currency: string;
  discountAmount: string | null;
  /** The price before the discount. Null when no coupon was used. */
  listAmount: string | null;
  /** Null while the payment is still at checkout. ADR-0001. */
  enrollmentId: string | null;
  id: string;
  metadata: Record<string, string | number | boolean | null> | null;
  paidAt: string | null;
  refundedAt: string | null;
  status: PaymentRecord["status"];
  transactionId: string;
  user?:
    | {
        email: string;
        id: string;
        name: string;
      }
    | undefined;
}

export interface AccountingPaymentsResponse {
  items: readonly PaymentHistoryItem[];
  limit: number;
  page: number;
  stats: PaymentDashboardStatsRecord;
  total: number;
}

function createTransactionId(): string {
  return `GENEX-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Where the browser is sent once the gateway settles.
 *
 * `origin` and `path` are both supplied by the client that started checkout,
 * because the two clients land in different places: the web app wants its own
 * return page, and the mobile app wants a web route that redirects into its
 * scheme — an in-app browser holds a session the app cannot read, so it needs
 * a hop it controls. Both are stored on the payment and read back from there
 * rather than from the gateway's callback, which is not ours to trust.
 */
export interface PaymentCallbackTarget {
  origin?: string | undefined;
  path?: string | undefined;
}

const DEFAULT_RETURN_PATH = "/dashboard/payments/return";

/**
 * Resolved with the URL parser rather than string concatenation, because
 * `path` may already carry a query string — the mobile app's deep link travels
 * that way — and `paymentId` has to merge into it rather than start a second
 * `?`. `callbackPathSchema` in `@genex/shared` has already refused anything that
 * could resolve to a different origin.
 */
function buildReturnUrl(
  origin: string,
  path: string,
  params: Readonly<Record<string, string>>
): string {
  const url = new URL(path, origin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = metadata?.[key];

  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatPayment(record: PaymentListRecord, includeUser = false): PaymentHistoryItem {
  return {
    amount: record.amount,
    couponCode: record.couponCode,
    course: {
      id: record.courseId,
      title: record.courseTitle
    },
    createdAt: record.createdAt.toISOString(),
    currency: record.currency,
    discountAmount: record.discountAmount,
    listAmount: record.listAmount,
    enrollmentId: record.enrollmentId,
    id: record.id,
    metadata: record.metadata,
    paidAt: record.paidAt?.toISOString() ?? null,
    refundedAt: record.refundedAt?.toISOString() ?? null,
    status: record.status,
    transactionId: record.transactionId,
    user: includeUser
      ? {
          email: record.userEmail,
          id: record.userId,
          name: record.userName
        }
      : undefined
  };
}

function formatEnrollment(record: StudentEnrollmentRecord): FormattedEnrollment {
  const progressPercentage =
    record.totalLectures === 0
      ? 0
      : Math.round((record.completedLectures / record.totalLectures) * 100);
  // The enrolment exists, so the right to study was real; the only question is
  // whether a refund has since withdrawn it. No price or payment check. ADR-0001.
  const accessGranted = record.cancelledAt === null;

  return {
    accessGranted,
    cancelledAt: record.cancelledAt ? record.cancelledAt.toISOString() : null,
    category: {
      name: record.categoryName,
      slug: record.categorySlug
    },
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    course: {
      coverImageUrl: record.courseCoverImageUrl,
      id: record.courseId,
      price: record.coursePrice,
      slug: record.courseSlug,
      status: record.courseStatus,
      title: record.courseTitle
    },
    enrolledAt: record.enrolledAt.toISOString(),
    id: record.id,
    latestPaymentStatus: record.latestPaymentStatus,
    progressPercentage,
    status: record.status
  };
}

export class CommerceService {
  public constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly sslCommerzService: SslCommerzService,
    private readonly reviewRepository: ReviewRepository,
    private readonly notificationService: NotificationService,
    private readonly couponService: CouponService
  ) {}

  private async getPublishedCourseOrThrow(courseId: string) {
    const course = await this.courseRepository.findById(courseId);

    if (!course || course.status !== "PUBLISHED") {
      throw new NotFoundError("Course not found");
    }

    return course;
  }

  private ensureStudent(currentUserRole: UserRole): void {
    if (currentUserRole !== "STUDENT") {
      throw new ForbiddenError("Only students can enroll in courses");
    }
  }

  public async createEnrollment(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    callback: PaymentCallbackTarget = {},
    couponCode?: string | undefined
  ): Promise<EnrollmentActionResponse> {
    this.ensureStudent(currentUserRole);

    const course = await this.getPublishedCourseOrThrow(courseId);
    const callbackBase = callback.origin ?? env.APP_URL;
    const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(
      currentUserId,
      courseId
    );

    if (
      existingEnrollment &&
      (await this.enrollmentRepository.hasCourseAccess(currentUserId, courseId))
    ) {
      return {
        accessGranted: true,
        enrollmentId: existingEnrollment.id,
        payment: null,
        requiresPayment: false
      };
    }

    // A free course is enrolled immediately — the right to study is real the
    // moment it is asked for. A priced course creates no enrolment here; that
    // happens in handlePaymentCallback once the money clears. ADR-0001.
    if (Number(course.price) <= 0) {
      const enrollment = await this.enrollmentRepository.grantAccess(currentUserId, courseId);

      return {
        accessGranted: true,
        enrollmentId: enrollment.id,
        payment: null,
        requiresPayment: false
      };
    }

    // Priced again here, from the course row. The buy card's preview is a
    // quote, never what the money is measured against. ADR-0013.
    const resolvedCoupon = couponCode
      ? await this.couponService.resolveForCheckout(courseId, couponCode, currentUserId)
      : null;
    const couponColumns = resolvedCoupon
      ? {
          couponCode: resolvedCoupon.coupon.code,
          couponId: resolvedCoupon.coupon.id,
          discountAmount: resolvedCoupon.pricing.discountAmount,
          listAmount: resolvedCoupon.pricing.listAmount
        }
      : {};
    const payable = resolvedCoupon ? resolvedCoupon.pricing.payable : course.price;

    // A coupon that reaches zero leaves nothing to collect, so the gateway is
    // skipped and the purchase settles here. The payment row is still written,
    // at 0.00 and marked COUPON, because the redemption has to be countable and
    // accounting still has to see the sale. ADR-0013.
    if (Number(payable) <= 0) {
      const enrollment = await this.enrollmentRepository.grantAccess(currentUserId, courseId);

      await this.paymentRepository.create({
        amount: "0.00",
        ...couponColumns,
        courseId,
        enrollmentId: enrollment.id,
        paidAt: new Date(),
        provider: "COUPON",
        status: "SUCCESS",
        transactionId: createTransactionId(),
        userId: currentUserId
      });

      return {
        accessGranted: true,
        enrollmentId: enrollment.id,
        payment: null,
        requiresPayment: false
      };
    }

    const profile = await this.profileRepository.findByUserId(currentUserId);

    if (!profile) {
      throw new NotFoundError("Profile not found");
    }
    const payment = await this.paymentRepository.create({
      amount: payable,
      ...couponColumns,
      courseId,
      enrollmentId: existingEnrollment?.id ?? null,
      metadata: {
        callbackOrigin: callbackBase,
        callbackPath: callback.path ?? DEFAULT_RETURN_PATH
      },
      transactionId: createTransactionId(),
      userId: currentUserId
    });
    const gatewaySession = await this.sslCommerzService.initiatePayment({
      amount: payment.amount,
      callbackOrigin: callbackBase,
      courseTitle: course.title,
      customerEmail: profile.email,
      customerName: profile.name,
      customerPhone: profile.studentProfile?.phone ?? undefined,
      paymentId: payment.id,
      transactionId: payment.transactionId
    });
    const updatedPayment = await this.paymentRepository.update(payment.id, {
      metadata: {
        ...gatewaySession.metadata,
        // Kept on the payment because the callback arrives with nothing but
        // the gateway's own parameters, minutes or hours later.
        callbackOrigin: callbackBase,
        callbackPath: callback.path ?? DEFAULT_RETURN_PATH,
        gatewayUrl: gatewaySession.gatewayUrl,
        transactionId: payment.transactionId
      }
    });

    return {
      accessGranted: false,
      enrollmentId: existingEnrollment?.id ?? null,
      payment: {
        gatewayUrl: gatewaySession.gatewayUrl,
        id: updatedPayment.id,
        isMock: gatewaySession.isMock,
        status: updatedPayment.status,
        transactionId: updatedPayment.transactionId
      },
      requiresPayment: true
    };
  }

  public async initializePayment(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    callback: PaymentCallbackTarget = {},
    couponCode?: string | undefined
  ): Promise<EnrollmentActionResponse> {
    return this.createEnrollment(courseId, currentUserId, currentUserRole, callback, couponCode);
  }

  public async listMyEnrollments(userId: string): Promise<readonly StudentEnrollmentItem[]> {
    const enrollments = await this.enrollmentRepository.listByUser(userId);
    const items = enrollments.map(formatEnrollment);
    const reviewedIds = await this.reviewRepository.courseIdsReviewedByUser(
      userId,
      items.map((item) => item.course.id)
    );

    return items.map((item) => ({ ...item, hasReview: reviewedIds.has(item.course.id) }));
  }

  public async getMyCourseEnrollment(
    userId: string,
    courseId: string
  ): Promise<StudentEnrollmentItem | null> {
    const enrollments = await this.enrollmentRepository.listByUser(userId);
    const record = enrollments.find((item) => item.courseId === courseId);

    if (!record) {
      return null;
    }

    const item = formatEnrollment(record);
    const hasReview = (await this.reviewRepository.findByUserAndCourse(courseId, userId)) !== null;

    return { ...item, hasReview };
  }

  public async listMyPayments(userId: string): Promise<readonly PaymentHistoryItem[]> {
    const records = await this.paymentRepository.listByUser(userId);

    return records.map((record) => formatPayment(record));
  }

  public async getPaymentById(
    paymentId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<PaymentHistoryItem> {
    const payment =
      currentUserRole === "ACCOUNTANT" || currentUserRole === "ADMIN"
        ? await this.paymentRepository.findById(paymentId)
        : await this.paymentRepository.findUserOwnedPayment(paymentId, currentUserId);

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    // The course is on the payment itself now, so an unsettled payment still
    // reports what it was for. ADR-0001.
    const course = await this.courseRepository.findById(payment.courseId);

    return {
      amount: payment.amount,
      couponCode: payment.couponCode,
      course: {
        id: course?.id ?? "",
        title: course?.title ?? "Course"
      },
      createdAt: payment.createdAt.toISOString(),
      currency: payment.currency,
      discountAmount: payment.discountAmount,
      listAmount: payment.listAmount,
      enrollmentId: payment.enrollmentId,
      id: payment.id,
      metadata: payment.metadata,
      paidAt: payment.paidAt?.toISOString() ?? null,
      refundedAt: payment.refundedAt?.toISOString() ?? null,
      status: payment.status,
      transactionId: payment.transactionId
    };
  }

  public async listAccountingPayments(
    currentUserRole: UserRole,
    query: {
      limit: number;
      page: number;
      status?: PaymentRecord["status"] | undefined;
    }
  ): Promise<AccountingPaymentsResponse> {
    if (currentUserRole !== "ACCOUNTANT" && currentUserRole !== "ADMIN") {
      throw new ForbiddenError("You do not have permission to view payment operations");
    }

    const [list, stats] = await Promise.all([
      this.paymentRepository.listForAccounting(query),
      this.paymentRepository.getAccountingStats()
    ]);

    return {
      items: list.items.map((item) => formatPayment(item, true)),
      limit: query.limit,
      page: query.page,
      stats,
      total: list.total
    };
  }

  public async handlePaymentCallback(input: {
    origin?: string | undefined;
    paymentId?: string | undefined;
    status: "SUCCESS" | "FAILED" | "CANCELLED";
    tranId?: string | undefined;
    valId?: string | undefined;
  }): Promise<string> {
    const payment = input.paymentId
      ? await this.paymentRepository.findById(input.paymentId)
      : input.tranId
        ? await this.paymentRepository.findByTransactionId(input.tranId)
        : null;

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    const callbackOrigin =
      input.origin ?? readMetadataString(payment.metadata, "callbackOrigin") ?? env.APP_URL;
    // Only ever read from the payment. The gateway echoes `origin` back for
    // compatibility, but it never saw the path, and taking a redirect target
    // from a callback body would be someone else's choice of destination.
    const callbackPath =
      readMetadataString(payment.metadata, "callbackPath") ?? DEFAULT_RETURN_PATH;

    if (input.status === "SUCCESS") {
      const validation =
        input.valId && input.valId.length > 0
          ? await this.sslCommerzService.validatePayment(input.valId)
          : await this.sslCommerzService.validatePayment(`MOCK-${payment.transactionId}`);

      if (validation.transactionId !== payment.transactionId) {
        throw new ConflictError("Payment validation failed for this transaction");
      }

      // The gateway's own verdict. Previously unread, so a response of
      // INVALID_TRANSACTION carrying a matching tran_id still settled. ADR-0001.
      if (!isSettledValidationStatus(validation.status)) {
        throw new ConflictError("Payment was not confirmed by the gateway");
      }

      // Guard against a tampered amount, measured against the Payable this
      // checkout agreed to — a discounted purchase collects less than the list
      // price by design. The coupon itself is not re-checked here: the money
      // has moved, and a rule that changed mid-payment is not the buyer's
      // problem, so a cap may end a use or two over. ADR-0013.
      // Mock mode reports no amount, so the comparison only applies when a real
      // gateway is configured.
      if (validation.amount !== null && Number(validation.amount) < Number(payment.amount)) {
        throw new ConflictError("Paid amount does not match the course price");
      }

      // The enrolment comes into existence here, and only here, for a priced
      // course. grantAccess also clears cancelledAt, so a student who was
      // refunded and has bought again gets their progress back. ADR-0001.
      const enrollment = await this.enrollmentRepository.grantAccess(
        payment.userId,
        payment.courseId
      );

      await this.paymentRepository.update(payment.id, {
        enrollmentId: enrollment.id,
        metadata: {
          ...payment.metadata,
          ...validation.metadata,
          callbackOrigin,
          valId: validation.validationId
        },
        paidAt: new Date(),
        status: "SUCCESS"
      });

      const settledCourse = await this.courseRepository.findById(payment.courseId);

      await this.notificationService.notifyUsers([payment.userId], {
        body: `Your payment of ${payment.currency} ${payment.amount} was received.`,
        data: {
          courseId: payment.courseId,
          paymentId: payment.id
        },
        title: settledCourse ? `You are enrolled in ${settledCourse.title}` : "Payment received",
        type: "PAYMENT"
      });

      return buildReturnUrl(callbackOrigin, callbackPath, {
        paymentId: payment.id,
        status: "success"
      });
    }

    await this.paymentRepository.update(payment.id, {
      metadata: {
        ...payment.metadata,
        callbackOrigin,
        lastCallbackStatus: input.status
      },
      status: "FAILED"
    });

    return buildReturnUrl(callbackOrigin, callbackPath, {
      paymentId: payment.id,
      status: input.status === "CANCELLED" ? "cancel" : "fail"
    });
  }

  public async validatePayment(valId: string): Promise<PaymentHistoryItem> {
    let payment = await this.paymentRepository.findByValidationId(valId);

    if (!payment) {
      const validation = await this.sslCommerzService.validatePayment(valId);
      payment = await this.paymentRepository.findByTransactionId(validation.transactionId);
    }

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    return this.getPaymentById(payment.id, payment.userId, "ADMIN");
  }

  public async refundPayment(
    paymentId: string,
    remarks: string | undefined,
    currentUserRole: UserRole
  ): Promise<PaymentHistoryItem> {
    if (currentUserRole !== "ACCOUNTANT" && currentUserRole !== "ADMIN") {
      throw new ForbiddenError("You do not have permission to refund payments");
    }

    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    if (payment.status !== "SUCCESS") {
      throw new ValidationError("Only successful payments can be refunded", [
        {
          field: "status",
          message: "Payment must be successful before refunding"
        }
      ]);
    }

    await this.paymentRepository.update(payment.id, {
      metadata: {
        ...payment.metadata,
        refundRemarks: remarks?.trim() || null
      },
      refundedAt: new Date(),
      status: "REFUNDED"
    });

    // Refunding withdraws the right to study, explicitly. Previously this
    // happened only as a side effect of hasCourseAccess matching on a SUCCESS
    // payment; now that access is the enrolment itself, it has to be said.
    // Progress, submissions, and completion are all left intact. ADR-0001.
    if (payment.enrollmentId) {
      await this.enrollmentRepository.cancelById(payment.enrollmentId);
    }

    await this.notificationService.notifyUsers([payment.userId], {
      body: `Your payment of ${payment.currency} ${payment.amount} has been refunded. Access to the course has ended.`,
      data: {
        courseId: payment.courseId,
        paymentId: payment.id
      },
      title: "Payment refunded",
      type: "PAYMENT"
    });

    return this.getPaymentById(payment.id, payment.userId, "ADMIN");
  }
}
