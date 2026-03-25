import type { UserRole } from "@mma/shared";

import { env } from "@/lib/env";
import { CourseRepository } from "@/repositories/course-repository";
import {
  EnrollmentRepository,
  type StudentEnrollmentRecord
} from "@/repositories/enrollment-repository";
import {
  PaymentRepository,
  type PaymentDashboardStatsRecord,
  type PaymentListRecord,
  type PaymentRecord
} from "@/repositories/payment-repository";
import { ProfileRepository } from "@/repositories/profile-repository";
import { SslCommerzService } from "@/services/sslcommerz-service";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface EnrollmentActionResponse {
  accessGranted: boolean;
  enrollmentId: string;
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
  category: {
    name: string;
    slug: string;
  };
  course: {
    coverImageUrl: string | null;
    id: string;
    price: string;
    slug: string;
    status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
    title: string;
  };
  enrolledAt: string;
  id: string;
  latestPaymentStatus: PaymentRecord["status"] | null;
  progressPercentage: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface PaymentHistoryItem {
  amount: string;
  course: {
    id: string;
    title: string;
  };
  createdAt: string;
  currency: string;
  enrollmentId: string;
  id: string;
  metadata: Record<string, string | number | boolean | null> | null;
  paidAt: string | null;
  refundedAt: string | null;
  status: PaymentRecord["status"];
  transactionId: string;
  user?: {
    email: string;
    id: string;
    name: string;
  } | undefined;
}

export interface AccountingPaymentsResponse {
  items: readonly PaymentHistoryItem[];
  limit: number;
  page: number;
  stats: PaymentDashboardStatsRecord;
  total: number;
}

function createTransactionId(): string {
  return `MMA-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function formatPayment(record: PaymentListRecord, includeUser = false): PaymentHistoryItem {
  return {
    amount: record.amount,
    course: {
      id: record.courseId,
      title: record.courseTitle
    },
    createdAt: record.createdAt.toISOString(),
    currency: record.currency,
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

function formatEnrollment(record: StudentEnrollmentRecord): StudentEnrollmentItem {
  const progressPercentage =
    record.totalLectures === 0
      ? 0
      : Math.round((record.completedLectures / record.totalLectures) * 100);
  const accessGranted =
    record.coursePrice === "0.00" || record.latestPaymentStatus === "SUCCESS";

  return {
    accessGranted,
    category: {
      name: record.categoryName,
      slug: record.categorySlug
    },
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
    private readonly sslCommerzService: SslCommerzService
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
    callbackOrigin?: string | undefined
  ): Promise<EnrollmentActionResponse> {
    this.ensureStudent(currentUserRole);

    const course = await this.getPublishedCourseOrThrow(courseId);
    const callbackBase = callbackOrigin ?? env.APP_URL;
    const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(
      currentUserId,
      courseId
    );

    if (existingEnrollment && (await this.enrollmentRepository.hasCourseAccess(currentUserId, courseId))) {
      return {
        accessGranted: true,
        enrollmentId: existingEnrollment.id,
        payment: null,
        requiresPayment: false
      };
    }

    let enrollment = existingEnrollment;

    if (!enrollment) {
      enrollment = await this.enrollmentRepository.create(currentUserId, courseId);
    }

    if (Number(course.price) <= 0) {
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
      amount: course.price,
      enrollmentId: enrollment.id,
      metadata: {
        callbackOrigin: callbackBase
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
        callbackOrigin: callbackOrigin ?? null,
        gatewayUrl: gatewaySession.gatewayUrl,
        transactionId: payment.transactionId
      }
    });

    return {
      accessGranted: false,
      enrollmentId: enrollment.id,
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
    callbackOrigin?: string | undefined
  ): Promise<EnrollmentActionResponse> {
    return this.createEnrollment(courseId, currentUserId, currentUserRole, callbackOrigin);
  }

  public async listMyEnrollments(userId: string): Promise<readonly StudentEnrollmentItem[]> {
    const enrollments = await this.enrollmentRepository.listByUser(userId);

    return enrollments.map(formatEnrollment);
  }

  public async getMyCourseEnrollment(userId: string, courseId: string): Promise<StudentEnrollmentItem | null> {
    const enrollments = await this.enrollmentRepository.listByUser(userId);
    const record = enrollments.find((item) => item.courseId === courseId);

    return record ? formatEnrollment(record) : null;
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

    const enrollment = await this.enrollmentRepository.findById(payment.enrollmentId);
    const course = enrollment
      ? await this.courseRepository.findById(enrollment.courseId)
      : null;

    return {
      amount: payment.amount,
      course: {
        id: course?.id ?? "",
        title: course?.title ?? "Course"
      },
      createdAt: payment.createdAt.toISOString(),
      currency: payment.currency,
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
    const payment =
      input.paymentId
        ? await this.paymentRepository.findById(input.paymentId)
        : input.tranId
          ? await this.paymentRepository.findByTransactionId(input.tranId)
          : null;

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    const callbackOrigin =
      input.origin ??
      (typeof payment.metadata?.callbackOrigin === "string" ? payment.metadata.callbackOrigin : env.APP_URL);

    if (input.status === "SUCCESS") {
      const validation =
        input.valId && input.valId.length > 0
          ? await this.sslCommerzService.validatePayment(input.valId)
          : await this.sslCommerzService.validatePayment(`MOCK-${payment.transactionId}`);

      if (validation.transactionId !== payment.transactionId) {
        throw new ConflictError("Payment validation failed for this transaction");
      }

      await this.paymentRepository.update(payment.id, {
        metadata: {
          ...payment.metadata,
          ...validation.metadata,
          callbackOrigin,
          valId: validation.validationId
        },
        paidAt: new Date(),
        status: "SUCCESS"
      });

      return `${callbackOrigin}/dashboard/payments/return?paymentId=${encodeURIComponent(payment.id)}&status=success`;
    }

    await this.paymentRepository.update(payment.id, {
      metadata: {
        ...payment.metadata,
        callbackOrigin,
        lastCallbackStatus: input.status
      },
      status: "FAILED"
    });

    return `${callbackOrigin}/dashboard/payments/return?paymentId=${encodeURIComponent(payment.id)}&status=${input.status === "CANCELLED" ? "cancel" : "fail"}`;
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

    return this.getPaymentById(payment.id, payment.userId, "ADMIN");
  }
}
