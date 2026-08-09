import type { CouponKind, CouponState } from "@mma/shared";
import {
  and,
  count,
  coupons,
  courses,
  db,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  payments,
  sql,
  users
} from "@mma/db";
import type { SQL } from "@mma/db";

export interface CouponRecord {
  code: string;
  /** Null is a Platform Coupon: every course. ADR-0013. */
  courseId: string | null;
  createdAt: Date;
  createdById: string;
  expiresAt: Date | null;
  id: string;
  isDisabled: boolean;
  isPublic: boolean;
  kind: CouponKind;
  maxRedemptions: number | null;
  startsAt: Date | null;
  updatedAt: Date;
  /** Taka for FLAT, percent for PERCENT. */
  value: string;
}

export interface CouponListRecord extends CouponRecord {
  courseSlug: string | null;
  courseTitle: string | null;
  createdByName: string;
  createdByRole: string;
  redemptionCount: number;
  /** Sum of the discount given across counted redemptions. */
  totalDiscount: string;
}

export interface CouponStatsRecord {
  redemptionCount: number;
  /** Collected on settled purchases that used this coupon. */
  revenue: string;
  totalDiscount: string;
}

export interface CouponRedemptionRecord {
  courseId: string;
  courseTitle: string;
  discountAmount: string | null;
  listAmount: string | null;
  paidAmount: string;
  paymentId: string;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  redeemedAt: Date;
  studentEmail: string;
  studentId: string;
  studentName: string;
}

export interface CouponSeriesPoint {
  count: number;
  date: string;
  discount: string;
}

export interface CouponCourseBreakdownRow {
  count: number;
  courseId: string;
  courseTitle: string;
  discount: string;
}

export interface CouponListQuery {
  courseId?: string | undefined;
  createdById?: string | undefined;
  /** Used for a teacher's read-only "affecting my courses" section. */
  excludeCreatedById?: string | undefined;
  id?: string | undefined;
  limit: number;
  page: number;
  /** Narrows to these courses plus every Platform Coupon. */
  scopeCourseIds?: readonly string[] | undefined;
  search?: string | undefined;
  state?: CouponState | undefined;
}

/**
 * How long an unfinished checkout holds a use.
 *
 * A priced course produces a PENDING payment and nothing else until the gateway
 * calls back (ADR-0001), and an abandoned checkout stays PENDING for ever —
 * there is no sweeper. So a hold expires by clock, inside the query, and the
 * cap stops leaking without anything having to run. ADR-0013.
 */
export const redemptionHoldMinutes = 30;

/**
 * What counts as a Redemption.
 *
 * SUCCESS and REFUNDED both count, permanently: the coupon was handed out and
 * used, and a refund does not unspend it. A fresh PENDING payment counts while
 * its hold lasts, so a hundred people cannot ride the last use at once.
 */
const countedRedemption = sql`(${payments.status} in ('SUCCESS', 'REFUNDED') or (${payments.status} = 'PENDING' and ${payments.createdAt} > now() - interval '${sql.raw(String(redemptionHoldMinutes))} minutes'))`;

/**
 * The discount this coupon would take off a given price, in SQL.
 *
 * Kept here as well as in the service because choosing which Public Coupon to
 * advertise means ordering by it, and ordering happens in the database.
 */
function discountExpression(price: SQL | string): SQL {
  return sql`case when ${coupons.kind} = 'FLAT' then least(${coupons.value}, ${price}) else round(${price} * ${coupons.value} / 100, 2) end`;
}

/**
 * Scheduled, Active, Expired, Exhausted or Disabled — derived every time it is
 * asked for. Nothing about a coupon's state is stored, so nothing can go stale.
 */
function stateExpression(redemptionCount: SQL): SQL {
  return sql`case
    when ${coupons.isDisabled} then 'DISABLED'
    when ${coupons.expiresAt} is not null and ${coupons.expiresAt} <= now() then 'EXPIRED'
    when ${coupons.startsAt} is not null and ${coupons.startsAt} > now() then 'SCHEDULED'
    when ${coupons.maxRedemptions} is not null and ${redemptionCount} >= ${coupons.maxRedemptions} then 'EXHAUSTED'
    else 'ACTIVE'
  end`;
}

export interface CreateCouponInput {
  code: string;
  courseId: string | null;
  createdById: string;
  expiresAt: Date | null;
  isDisabled: boolean;
  isPublic: boolean;
  kind: CouponKind;
  maxRedemptions: number | null;
  startsAt: Date | null;
  value: string;
}

export interface UpdateCouponInput {
  code?: string | undefined;
  courseId?: string | null | undefined;
  expiresAt?: Date | null | undefined;
  isDisabled?: boolean | undefined;
  isPublic?: boolean | undefined;
  kind?: CouponKind | undefined;
  maxRedemptions?: number | null | undefined;
  startsAt?: Date | null | undefined;
  value?: string | undefined;
}

export class CouponRepository {
  public async create(input: CreateCouponInput): Promise<CouponRecord> {
    const [record] = await db.insert(coupons).values(input).returning();

    if (!record) {
      throw new Error("Failed to create coupon");
    }

    return record;
  }

  public async findById(id: string): Promise<CouponRecord | null> {
    const [record] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);

    return record ?? null;
  }

  /**
   * The coupon a typed code resolves to for one course.
   *
   * A coupon on the course itself wins over a Platform Coupon of the same code
   * — the more specific rule, and the teacher who set the price keeps the last
   * word on it. ADR-0013.
   */
  public async findByCodeForCourse(courseId: string, code: string): Promise<CouponRecord | null> {
    const [record] = await db
      .select()
      .from(coupons)
      .where(
        and(
          sql`upper(${coupons.code}) = upper(${code})`,
          or(eq(coupons.courseId, courseId), isNull(coupons.courseId))
        )
      )
      .orderBy(sql`(${coupons.courseId} is null) asc`)
      .limit(1);

    return record ?? null;
  }

  /** Used to refuse a duplicate code before the unique index does it less kindly. */
  public async findByCodeInScope(
    courseId: string | null,
    code: string,
    excludeId?: string
  ): Promise<CouponRecord | null> {
    const scope = courseId === null ? isNull(coupons.courseId) : eq(coupons.courseId, courseId);
    const [record] = await db
      .select()
      .from(coupons)
      .where(
        and(
          sql`upper(${coupons.code}) = upper(${code})`,
          scope,
          excludeId ? ne(coupons.id, excludeId) : undefined
        )
      )
      .limit(1);

    return record ?? null;
  }

  public async update(id: string, input: UpdateCouponInput): Promise<CouponRecord | null> {
    const [record] = await db
      .update(coupons)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning();

    return record ?? null;
  }

  public async delete(id: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  /**
   * Any payment at all that named this coupon, whatever became of it.
   *
   * Deletion is checked against this rather than against counted redemptions: a
   * failed checkout is still a record of the code having been used, and
   * deleting the coupon would blank it.
   */
  public async countPaymentsReferencing(couponId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(payments)
      .where(eq(payments.couponId, couponId));

    return Number(row?.value ?? 0);
  }

  public async countRedemptions(couponId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(payments)
      .where(and(eq(payments.couponId, couponId), countedRedemption));

    return Number(row?.value ?? 0);
  }

  public async countRedemptionsByUser(couponId: string, userId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(payments)
      .where(and(eq(payments.couponId, couponId), eq(payments.userId, userId), countedRedemption));

    return Number(row?.value ?? 0);
  }

  public async getStats(couponId: string): Promise<CouponStatsRecord> {
    const [row] = await db
      .select({
        redemptionCount: count(),
        revenue: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'SUCCESS'), '0')`,
        totalDiscount: sql<string>`coalesce(sum(${payments.discountAmount}), '0')`
      })
      .from(payments)
      .where(and(eq(payments.couponId, couponId), countedRedemption));

    return {
      redemptionCount: Number(row?.redemptionCount ?? 0),
      revenue: row?.revenue ?? "0",
      totalDiscount: row?.totalDiscount ?? "0"
    };
  }

  public async listRedemptions(
    couponId: string,
    input: { limit: number; page: number }
  ): Promise<{ items: readonly CouponRedemptionRecord[]; total: number }> {
    const offset = (input.page - 1) * input.limit;
    const where = and(eq(payments.couponId, couponId), countedRedemption);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          courseId: payments.courseId,
          courseTitle: courses.title,
          discountAmount: payments.discountAmount,
          listAmount: payments.listAmount,
          paidAmount: payments.amount,
          paymentId: payments.id,
          paymentStatus: payments.status,
          redeemedAt: payments.createdAt,
          studentEmail: users.email,
          studentId: payments.userId,
          studentName: users.name
        })
        .from(payments)
        .innerJoin(courses, eq(payments.courseId, courses.id))
        .innerJoin(users, eq(payments.userId, users.id))
        .where(where)
        .orderBy(desc(payments.createdAt))
        .limit(input.limit)
        .offset(offset),
      db.select({ value: count() }).from(payments).where(where)
    ]);

    return { items, total: Number(totalRows[0]?.value ?? 0) };
  }

  /** Redemptions per day, for the detail page's chart. */
  public async getRedemptionSeries(
    couponId: string,
    days: number
  ): Promise<readonly CouponSeriesPoint[]> {
    const rows = await db
      .select({
        count: count(),
        date: sql<string>`to_char(date_trunc('day', ${payments.createdAt}), 'YYYY-MM-DD')`,
        discount: sql<string>`coalesce(sum(${payments.discountAmount}), '0')`
      })
      .from(payments)
      .where(
        and(
          eq(payments.couponId, couponId),
          countedRedemption,
          sql`${payments.createdAt} > now() - interval '${sql.raw(String(Math.trunc(days)))} days'`
        )
      )
      .groupBy(sql`date_trunc('day', ${payments.createdAt})`)
      .orderBy(sql`date_trunc('day', ${payments.createdAt}) asc`);

    return rows.map((row) => ({ count: Number(row.count), date: row.date, discount: row.discount }));
  }

  /** Where a Platform Coupon actually landed. Empty for a single-course one. */
  public async getCourseBreakdown(
    couponId: string
  ): Promise<readonly CouponCourseBreakdownRow[]> {
    const rows = await db
      .select({
        count: count(),
        courseId: payments.courseId,
        courseTitle: courses.title,
        discount: sql<string>`coalesce(sum(${payments.discountAmount}), '0')`
      })
      .from(payments)
      .innerJoin(courses, eq(payments.courseId, courses.id))
      .where(and(eq(payments.couponId, couponId), countedRedemption))
      .groupBy(payments.courseId, courses.title)
      .orderBy(desc(count()));

    return rows.map((row) => ({
      count: Number(row.count),
      courseId: row.courseId,
      courseTitle: row.courseTitle,
      discount: row.discount
    }));
  }

  /**
   * The one Public Coupon worth showing on a course page: valid now, and the
   * biggest saving against this course's price. Newest wins a tie.
   */
  public async findBestPublicCoupon(
    courseId: string,
    price: string
  ): Promise<CouponRecord | null> {
    const usage = this.usageSubquery();
    const redemptionCount = sql<number>`coalesce(${usage.redemptionCount}, 0)`;
    const rows = await db
      .select({ coupon: coupons })
      .from(coupons)
      .leftJoin(usage, eq(coupons.id, usage.couponId))
      .where(
        and(
          eq(coupons.isPublic, true),
          eq(coupons.isDisabled, false),
          or(eq(coupons.courseId, courseId), isNull(coupons.courseId)),
          sql`(${coupons.startsAt} is null or ${coupons.startsAt} <= now())`,
          sql`(${coupons.expiresAt} is null or ${coupons.expiresAt} > now())`,
          sql`(${coupons.maxRedemptions} is null or ${redemptionCount} < ${coupons.maxRedemptions})`
        )
      )
      .orderBy(sql`${discountExpression(price)} desc`, desc(coupons.createdAt))
      .limit(1);

    return rows[0]?.coupon ?? null;
  }

  /** One coupon with the same aggregates the list carries. */
  public async findListRecordById(id: string): Promise<CouponListRecord | null> {
    const result = await this.list({ id, limit: 1, page: 1 });

    return result.items[0] ?? null;
  }

  public async list(
    query: CouponListQuery
  ): Promise<{ items: readonly CouponListRecord[]; total: number }> {
    const usage = this.usageSubquery();
    const redemptionCount = sql<number>`coalesce(${usage.redemptionCount}, 0)`;
    const filters: (SQL | undefined)[] = [
      query.id ? eq(coupons.id, query.id) : undefined,
      query.createdById ? eq(coupons.createdById, query.createdById) : undefined,
      query.excludeCreatedById ? ne(coupons.createdById, query.excludeCreatedById) : undefined,
      query.courseId ? eq(coupons.courseId, query.courseId) : undefined,
      query.search ? ilike(coupons.code, `%${query.search}%`) : undefined,
      query.state ? sql`${stateExpression(redemptionCount)} = ${query.state}` : undefined
    ];

    if (query.scopeCourseIds) {
      // A Platform Coupon has no course but still lands on every one of them,
      // so it belongs in a teacher's "affecting my courses" list.
      filters.push(
        query.scopeCourseIds.length > 0
          ? or(inArray(coupons.courseId, [...query.scopeCourseIds]), isNull(coupons.courseId))
          : isNull(coupons.courseId)
      );
    }

    const where = and(...filters.filter((filter): filter is SQL => filter !== undefined));
    const offset = (query.page - 1) * query.limit;
    const [items, totalRows] = await Promise.all([
      db
        .select({
          code: coupons.code,
          courseId: coupons.courseId,
          courseSlug: courses.slug,
          courseTitle: courses.title,
          createdAt: coupons.createdAt,
          createdById: coupons.createdById,
          createdByName: users.name,
          createdByRole: users.role,
          expiresAt: coupons.expiresAt,
          id: coupons.id,
          isDisabled: coupons.isDisabled,
          isPublic: coupons.isPublic,
          kind: coupons.kind,
          maxRedemptions: coupons.maxRedemptions,
          redemptionCount: redemptionCount,
          startsAt: coupons.startsAt,
          totalDiscount: sql<string>`coalesce(${usage.totalDiscount}, '0')`,
          updatedAt: coupons.updatedAt,
          value: coupons.value
        })
        .from(coupons)
        .leftJoin(usage, eq(coupons.id, usage.couponId))
        .leftJoin(courses, eq(coupons.courseId, courses.id))
        .innerJoin(users, eq(coupons.createdById, users.id))
        .where(where)
        .orderBy(desc(coupons.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(coupons)
        .leftJoin(usage, eq(coupons.id, usage.couponId))
        .where(where)
    ]);

    return {
      items: items.map((item) => ({ ...item, redemptionCount: Number(item.redemptionCount) })),
      total: Number(totalRows[0]?.value ?? 0)
    };
  }

  /**
   * Uses and discount given, per coupon, counted off the payments themselves.
   * There is no counter column to drift. ADR-0013.
   */
  private usageSubquery() {
    return db
      .select({
        couponId: payments.couponId,
        redemptionCount: count().as("redemption_count"),
        totalDiscount: sql<string>`coalesce(sum(${payments.discountAmount}), '0')`.as(
          "total_discount"
        )
      })
      .from(payments)
      .where(countedRedemption)
      .groupBy(payments.couponId)
      .as("coupon_usage");
  }
}
