import type {
  CouponKind,
  CouponRejectionReason,
  CouponState,
  UserRole
} from "@genex/shared";

import type { CourseRepository } from "@/repositories/course-repository";
import type {
  CouponCourseBreakdownRow,
  CouponListRecord,
  CouponRecord,
  CouponRepository,
  CouponSeriesPoint
} from "@/repositories/coupon-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import { priceWithCoupon, type CouponPricing } from "@/services/coupon-pricing";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface CouponActor {
  id: string;
  role: UserRole;
}

export interface CouponItem {
  code: string;
  course: { id: string; slug: string; title: string } | null;
  createdAt: string;
  createdBy: { id: string; name: string; role: string };
  expiresAt: string | null;
  id: string;
  isDisabled: boolean;
  isPublic: boolean;
  /** True when the viewer may edit it. A teacher sees admin coupons read-only. */
  isEditable: boolean;
  kind: CouponKind;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: string | null;
  state: CouponState;
  totalDiscount: string;
  updatedAt: string;
  value: string;
}

export interface CouponDetail extends CouponItem {
  courseBreakdown: readonly CouponCourseBreakdownRow[];
  redemptionSeries: readonly CouponSeriesPoint[];
  revenue: string;
}

export interface CouponRedemptionItem {
  course: { id: string; title: string };
  discountAmount: string;
  listAmount: string;
  paidAmount: string;
  paymentId: string;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  redeemedAt: string;
  student: { email: string; id: string; name: string };
}

export interface CouponPreviewResult {
  coupon:
    | {
        code: string;
        id: string;
        kind: CouponKind;
        value: string;
      }
    | null;
  pricing: CouponPricing | null;
  reason: CouponRejectionReason | null;
  status: "APPLIED" | "REJECTED";
}

/** What checkout needs once a code has survived every rule. */
export interface ResolvedCoupon {
  coupon: CouponRecord;
  pricing: CouponPricing;
}

/** The one Public Coupon a course page advertises. */
export interface PublicCouponSummary {
  code: string;
  discountAmount: string;
  id: string;
  kind: CouponKind;
  payable: string;
  value: string;
}

export interface CreateCouponServiceInput {
  code: string;
  courseId?: string | null | undefined;
  expiresAt?: string | null | undefined;
  isDisabled: boolean;
  isPublic: boolean;
  kind: CouponKind;
  maxRedemptions?: number | null | undefined;
  startsAt?: string | null | undefined;
  value: number;
}

export interface UpdateCouponServiceInput {
  code?: string | undefined;
  courseId?: string | null | undefined;
  expiresAt?: string | null | undefined;
  isDisabled?: boolean | undefined;
  isPublic?: boolean | undefined;
  kind?: CouponKind | undefined;
  maxRedemptions?: number | null | undefined;
  startsAt?: string | null | undefined;
  value?: number | undefined;
}

const REDEMPTION_SERIES_DAYS = 90;

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

/**
 * Scheduled, Active, Expired, Exhausted or Disabled — derived, never stored, so
 * a coupon cannot sit in the list claiming to be active a week after it ended.
 */
function deriveState(coupon: CouponRecord, redemptionCount: number): CouponState {
  const now = Date.now();

  if (coupon.isDisabled) {
    return "DISABLED";
  }

  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now) {
    return "EXPIRED";
  }

  if (coupon.startsAt && coupon.startsAt.getTime() > now) {
    return "SCHEDULED";
  }

  if (coupon.maxRedemptions !== null && redemptionCount >= coupon.maxRedemptions) {
    return "EXHAUSTED";
  }

  return "ACTIVE";
}

export class CouponService {
  public constructor(
    private readonly couponRepository: CouponRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  public async create(input: CreateCouponServiceInput, actor: CouponActor): Promise<CouponItem> {
    const courseId = input.courseId ?? null;

    await this.assertMayManageScope(courseId, actor);
    await this.assertCodeIsFree(courseId, input.code);

    const record = await this.couponRepository.create({
      code: input.code.toUpperCase(),
      courseId,
      createdById: actor.id,
      expiresAt: toDate(input.expiresAt),
      isDisabled: input.isDisabled,
      isPublic: input.isPublic,
      kind: input.kind,
      maxRedemptions: input.maxRedemptions ?? null,
      startsAt: toDate(input.startsAt),
      value: input.value.toFixed(2)
    });

    return this.getById(record.id, actor);
  }

  public async update(
    id: string,
    input: UpdateCouponServiceInput,
    actor: CouponActor
  ): Promise<CouponItem> {
    const existing = await this.findOrThrow(id);

    await this.assertMayManage(existing, actor);

    const nextCourseId = input.courseId === undefined ? existing.courseId : input.courseId;

    if (input.courseId !== undefined && input.courseId !== existing.courseId) {
      await this.assertMayManageScope(nextCourseId, actor);
    }

    if (input.code !== undefined || input.courseId !== undefined) {
      await this.assertCodeIsFree(nextCourseId, input.code ?? existing.code, id);
    }

    // A percentage arriving on its own has to be checked against the kind the
    // coupon already has — the schema can only see what was sent.
    const nextKind = input.kind ?? existing.kind;

    if (input.value !== undefined && nextKind === "PERCENT" && (input.value < 1 || input.value > 100)) {
      throw new ValidationError("A percentage discount must be between 1 and 100", [
        { field: "value", message: "Must be between 1 and 100" }
      ]);
    }

    await this.couponRepository.update(id, {
      ...(input.code === undefined ? {} : { code: input.code.toUpperCase() }),
      ...(input.courseId === undefined ? {} : { courseId: input.courseId }),
      ...(input.expiresAt === undefined ? {} : { expiresAt: toDate(input.expiresAt) }),
      ...(input.isDisabled === undefined ? {} : { isDisabled: input.isDisabled }),
      ...(input.isPublic === undefined ? {} : { isPublic: input.isPublic }),
      ...(input.kind === undefined ? {} : { kind: input.kind }),
      ...(input.maxRedemptions === undefined ? {} : { maxRedemptions: input.maxRedemptions }),
      ...(input.startsAt === undefined ? {} : { startsAt: toDate(input.startsAt) }),
      ...(input.value === undefined ? {} : { value: input.value.toFixed(2) })
    });

    return this.getById(id, actor);
  }

  /**
   * Deleting is only for a coupon nobody ever used. Once a payment names it,
   * disabling is the only way out — the alternative blanks the reason a buyer
   * paid what they paid.
   */
  public async remove(id: string, actor: CouponActor): Promise<void> {
    const existing = await this.findOrThrow(id);

    await this.assertMayManage(existing, actor);

    const referencing = await this.couponRepository.countPaymentsReferencing(id);

    if (referencing > 0) {
      throw new ConflictError("This coupon has been used and can only be disabled");
    }

    await this.couponRepository.delete(id);
  }

  public async list(
    query: {
      courseId?: string | undefined;
      createdById?: string | undefined;
      limit: number;
      othersOnCourses?: boolean | undefined;
      page: number;
      search?: string | undefined;
      state?: CouponState | undefined;
    },
    actor: CouponActor
  ): Promise<{ items: readonly CouponItem[]; total: number }> {
    if (actor.role === "STUDENT") {
      throw new ForbiddenError("You do not have permission to view coupons");
    }

    const scope: {
      createdById?: string | undefined;
      excludeCreatedById?: string | undefined;
      scopeCourseIds?: readonly string[] | undefined;
    } = {};

    if (actor.role === "TEACHER") {
      if (query.othersOnCourses) {
        // The read-only section: what somebody else aimed at a course this
        // teacher owns, including every Platform Coupon.
        scope.excludeCreatedById = actor.id;
        scope.scopeCourseIds = await this.courseRepository.getOwnedCourseIds(actor.id);
      } else {
        scope.createdById = actor.id;
      }
    } else if (query.createdById) {
      scope.createdById = query.createdById;
    }

    const result = await this.couponRepository.list({
      ...scope,
      courseId: query.courseId,
      limit: query.limit,
      page: query.page,
      search: query.search,
      state: query.state
    });

    return {
      items: result.items.map((item) => this.formatListRecord(item, actor)),
      total: result.total
    };
  }

  public async getById(id: string, actor: CouponActor): Promise<CouponItem> {
    // Read back through the list query, so the uses and the discount total on a
    // detail page are the same numbers the list showed, counted the same way.
    const record = await this.couponRepository.findListRecordById(id);

    if (!record) {
      throw new NotFoundError("Coupon not found");
    }

    await this.assertMayView(record, actor);

    return this.formatListRecord(record, actor);
  }

  public async getDetail(id: string, actor: CouponActor): Promise<CouponDetail> {
    const item = await this.getById(id, actor);
    const [stats, series, breakdown] = await Promise.all([
      this.couponRepository.getStats(id),
      this.couponRepository.getRedemptionSeries(id, REDEMPTION_SERIES_DAYS),
      this.couponRepository.getCourseBreakdown(id)
    ]);

    return {
      ...item,
      courseBreakdown: breakdown,
      redemptionSeries: series,
      revenue: stats.revenue
    };
  }

  public async listRedemptions(
    id: string,
    query: { limit: number; page: number },
    actor: CouponActor
  ): Promise<{ items: readonly CouponRedemptionItem[]; total: number }> {
    await this.getById(id, actor);

    const result = await this.couponRepository.listRedemptions(id, query);

    return {
      items: result.items.map((record) => ({
        course: { id: record.courseId, title: record.courseTitle },
        discountAmount: record.discountAmount ?? "0.00",
        listAmount: record.listAmount ?? record.paidAmount,
        paidAmount: record.paidAmount,
        paymentId: record.paymentId,
        paymentStatus: record.paymentStatus,
        redeemedAt: record.redeemedAt.toISOString(),
        student: { email: record.studentEmail, id: record.studentId, name: record.studentName }
      })),
      total: result.total
    };
  }

  /**
   * What the buy card shows before the student commits.
   *
   * Answers with a reason rather than an error, so the client can say it in
   * Bangla. Checkout runs the same rules again and does throw — a preview is
   * never what the money is priced from.
   */
  public async preview(
    courseId: string,
    code: string,
    studentId: string
  ): Promise<CouponPreviewResult> {
    const outcome = await this.evaluate(courseId, code, studentId);

    if (outcome.reason !== null) {
      return { coupon: null, pricing: null, reason: outcome.reason, status: "REJECTED" };
    }

    return {
      coupon: {
        code: outcome.resolved.coupon.code,
        id: outcome.resolved.coupon.id,
        kind: outcome.resolved.coupon.kind,
        value: outcome.resolved.coupon.value
      },
      pricing: outcome.resolved.pricing,
      reason: null,
      status: "APPLIED"
    };
  }

  /** The same rules, at the point where money is about to move. */
  public async resolveForCheckout(
    courseId: string,
    code: string,
    studentId: string
  ): Promise<ResolvedCoupon> {
    const outcome = await this.evaluate(courseId, code, studentId);

    if (outcome.reason !== null) {
      throw new ValidationError("This coupon cannot be used", [
        { field: "couponCode", message: outcome.reason }
      ]);
    }

    return outcome.resolved;
  }

  public async findPublicCouponForCourse(
    courseId: string,
    price: string
  ): Promise<PublicCouponSummary | null> {
    if (Number(price) <= 0) {
      return null;
    }

    const coupon = await this.couponRepository.findBestPublicCoupon(courseId, price);

    if (!coupon) {
      return null;
    }

    const pricing = priceWithCoupon(price, coupon.kind, coupon.value);

    return {
      code: coupon.code,
      discountAmount: pricing.discountAmount,
      id: coupon.id,
      kind: coupon.kind,
      payable: pricing.payable,
      value: coupon.value
    };
  }

  private async evaluate(
    courseId: string,
    code: string,
    studentId: string
  ): Promise<
    { reason: CouponRejectionReason; resolved: null } | { reason: null; resolved: ResolvedCoupon }
  > {
    const course = await this.courseRepository.findById(courseId);

    if (!course || course.status !== "PUBLISHED") {
      return { reason: "COURSE_UNAVAILABLE", resolved: null };
    }

    if (Number(course.price) <= 0) {
      return { reason: "FREE_COURSE", resolved: null };
    }

    const coupon = await this.couponRepository.findByCodeForCourse(courseId, code);

    if (!coupon) {
      return { reason: "NOT_FOUND", resolved: null };
    }

    if (coupon.isDisabled) {
      return { reason: "DISABLED", resolved: null };
    }

    const now = Date.now();

    if (coupon.startsAt && coupon.startsAt.getTime() > now) {
      return { reason: "NOT_STARTED", resolved: null };
    }

    if (coupon.expiresAt && coupon.expiresAt.getTime() <= now) {
      return { reason: "EXPIRED", resolved: null };
    }

    if (coupon.maxRedemptions !== null) {
      const used = await this.couponRepository.countRedemptions(coupon.id);

      if (used >= coupon.maxRedemptions) {
        return { reason: "EXHAUSTED", resolved: null };
      }
    }

    // Once per student, counting refunded uses: a refund cancels the enrolment
    // but does not unspend the coupon. ADR-0013.
    const usedByStudent = await this.couponRepository.countRedemptionsByUser(coupon.id, studentId);

    if (usedByStudent > 0) {
      return { reason: "ALREADY_USED", resolved: null };
    }

    if (await this.enrollmentRepository.hasCourseAccess(studentId, courseId)) {
      return { reason: "ALREADY_ENROLLED", resolved: null };
    }

    return {
      reason: null,
      resolved: { coupon, pricing: priceWithCoupon(course.price, coupon.kind, coupon.value) }
    };
  }

  private async findOrThrow(id: string): Promise<CouponRecord> {
    const record = await this.couponRepository.findById(id);

    if (!record) {
      throw new NotFoundError("Coupon not found");
    }

    return record;
  }

  private async assertCodeIsFree(
    courseId: string | null,
    code: string,
    excludeId?: string
  ): Promise<void> {
    const clash = await this.couponRepository.findByCodeInScope(courseId, code, excludeId);

    if (clash) {
      throw new ConflictError("That code is already in use here");
    }
  }

  /**
   * Who may aim a coupon at what.
   *
   * An Admin may aim one anywhere, including at every course at once. A teacher
   * may only do it on a course they own — a coupon changes what a buyer pays,
   * and price is the Owner's, not a content collaborator's. ADR-0006.
   */
  private async assertMayManageScope(courseId: string | null, actor: CouponActor): Promise<void> {
    if (actor.role === "ADMIN") {
      return;
    }

    if (actor.role !== "TEACHER") {
      throw new ForbiddenError("You do not have permission to manage coupons");
    }

    if (courseId === null) {
      throw new ForbiddenError("Only an admin can create a coupon for every course");
    }

    const course = await this.courseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    const isOwner = course.teachers.some(
      (teacher) => teacher.id === actor.id && teacher.role === "OWNER"
    );

    if (!isOwner) {
      throw new ForbiddenError("Only the course owner can create coupons for this course");
    }
  }

  private async assertMayManage(coupon: CouponRecord, actor: CouponActor): Promise<void> {
    if (actor.role === "ADMIN") {
      return;
    }

    if (coupon.createdById !== actor.id) {
      throw new ForbiddenError("You can only change coupons you created");
    }

    await this.assertMayManageScope(coupon.courseId, actor);
  }

  private async assertMayView(coupon: CouponListRecord, actor: CouponActor): Promise<void> {
    if (actor.role === "ADMIN" || actor.role === "ACCOUNTANT") {
      return;
    }

    if (actor.role !== "TEACHER") {
      throw new ForbiddenError("You do not have permission to view coupons");
    }

    if (coupon.createdById === actor.id) {
      return;
    }

    // A teacher may read an admin's coupon when it lands on a course they own,
    // because it explains why ৳1199 arrived for a ৳1499 course.
    const ownedCourseIds = await this.courseRepository.getOwnedCourseIds(actor.id);

    if (coupon.courseId === null || ownedCourseIds.includes(coupon.courseId)) {
      return;
    }

    throw new ForbiddenError("You do not have permission to view this coupon");
  }

  private formatListRecord(record: CouponListRecord, actor: CouponActor): CouponItem {
    const isEditable = actor.role === "ADMIN" || record.createdById === actor.id;

    return {
      code: record.code,
      course:
        record.courseId === null
          ? null
          : {
              id: record.courseId,
              slug: record.courseSlug ?? "",
              title: record.courseTitle ?? ""
            },
      createdAt: record.createdAt.toISOString(),
      createdBy: { id: record.createdById, name: record.createdByName, role: record.createdByRole },
      expiresAt: record.expiresAt?.toISOString() ?? null,
      id: record.id,
      isDisabled: record.isDisabled,
      isEditable,
      isPublic: record.isPublic,
      kind: record.kind,
      maxRedemptions: record.maxRedemptions,
      redemptionCount: record.redemptionCount,
      startsAt: record.startsAt?.toISOString() ?? null,
      state: deriveState(record, record.redemptionCount),
      totalDiscount: record.totalDiscount,
      updatedAt: record.updatedAt.toISOString(),
      value: record.value
    };
  }
}
