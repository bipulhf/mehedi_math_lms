import { and, db, desc, eq, payments, sql } from "@genex/db";

export interface PaymentRecord {
  amount: string;
  /** Known at checkout. The enrolment is not, so this is the durable link. */
  courseId: string;
  createdAt: Date;
  currency: string;
  /** Null until the payment settles and the enrolment is created. ADR-0001. */
  enrollmentId: string | null;
  id: string;
  metadata: Record<string, string | number | boolean | null> | null;
  paidAt: Date | null;
  provider: "SSLCOMMERZ";
  refundedAt: Date | null;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  transactionId: string;
  updatedAt: Date;
  userId: string;
}

export interface PaymentListRecord extends PaymentRecord {
  courseTitle: string;
  userEmail: string;
  userName: string;
}

export interface PaymentDashboardStatsRecord {
  pendingPayments: number;
  refundedRevenue: number;
  successfulPayments: number;
  totalRevenue: number;
}

function mapPaymentRecord(record: typeof payments.$inferSelect): PaymentRecord {
  return record;
}

export class PaymentRepository {
  public async create(input: {
    amount: string;
    courseId: string;
    enrollmentId?: string | null | undefined;
    metadata?: Record<string, string | number | boolean | null> | null | undefined;
    transactionId: string;
    userId: string;
  }): Promise<PaymentRecord> {
    const [record] = await db
      .insert(payments)
      .values({
        amount: input.amount,
        courseId: input.courseId,
        enrollmentId: input.enrollmentId ?? null,
        metadata: input.metadata ?? null,
        transactionId: input.transactionId,
        userId: input.userId
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create payment");
    }

    return mapPaymentRecord(record);
  }

  public async findById(id: string): Promise<PaymentRecord | null> {
    const [record] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);

    return record ? mapPaymentRecord(record) : null;
  }

  public async findByTransactionId(transactionId: string): Promise<PaymentRecord | null> {
    const [record] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, transactionId))
      .limit(1);

    return record ? mapPaymentRecord(record) : null;
  }

  public async findByValidationId(valId: string): Promise<PaymentRecord | null> {
    const [record] = await db
      .select()
      .from(payments)
      .where(sql`${payments.metadata}->>'valId' = ${valId}`)
      .limit(1);

    return record ? mapPaymentRecord(record) : null;
  }

  public async findLatestByEnrollmentId(enrollmentId: string): Promise<PaymentRecord | null> {
    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.enrollmentId, enrollmentId))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    return rows[0] ? mapPaymentRecord(rows[0]) : null;
  }

  public async findLatestSuccessByEnrollmentId(enrollmentId: string): Promise<PaymentRecord | null> {
    const rows = await db
      .select()
      .from(payments)
      .where(and(eq(payments.enrollmentId, enrollmentId), eq(payments.status, "SUCCESS")))
      .orderBy(desc(payments.paidAt), desc(payments.createdAt))
      .limit(1);

    return rows[0] ? mapPaymentRecord(rows[0]) : null;
  }

  public async update(
    id: string,
    input: {
      enrollmentId?: string | null | undefined;
      metadata?: Record<string, string | number | boolean | null> | null | undefined;
      paidAt?: Date | null | undefined;
      refundedAt?: Date | null | undefined;
      status?: PaymentRecord["status"] | undefined;
    }
  ): Promise<PaymentRecord> {
    const [record] = await db
      .update(payments)
      .set({
        ...(input.enrollmentId === undefined ? {} : { enrollmentId: input.enrollmentId }),
        metadata: input.metadata,
        paidAt: input.paidAt,
        refundedAt: input.refundedAt,
        status: input.status,
        updatedAt: new Date()
      })
      .where(eq(payments.id, id))
      .returning();

    if (!record) {
      throw new Error("Failed to update payment");
    }

    return mapPaymentRecord(record);
  }

  public async listByUser(userId: string): Promise<readonly PaymentListRecord[]> {
    const rows = await db
      .select({
        amount: payments.amount,
        courseId: payments.courseId,
        courseTitle: sql<string>`(select c.title from courses c where c.id = ${payments.courseId})`,
        createdAt: payments.createdAt,
        currency: payments.currency,
        enrollmentId: payments.enrollmentId,
        id: payments.id,
        metadata: payments.metadata,
        paidAt: payments.paidAt,
        provider: payments.provider,
        refundedAt: payments.refundedAt,
        status: payments.status,
        transactionId: payments.transactionId,
        updatedAt: payments.updatedAt,
        userEmail: sql<string>`''`,
        userId: payments.userId,
        userName: sql<string>`''`
      })
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(sql`${payments.createdAt} desc`);

    return rows;
  }

  public async listForAccounting(input: {
    limit: number;
    page: number;
    status?: PaymentRecord["status"] | undefined;
  }): Promise<{ items: readonly PaymentListRecord[]; total: number }> {
    const offset = (input.page - 1) * input.limit;
    const whereClause = input.status ? eq(payments.status, input.status) : undefined;
    const [items, totalRows] = await Promise.all([
      db
        .select({
          amount: payments.amount,
          courseId: payments.courseId,
          courseTitle: sql<string>`(select c.title from courses c where c.id = ${payments.courseId})`,
          createdAt: payments.createdAt,
          currency: payments.currency,
          enrollmentId: payments.enrollmentId,
          id: payments.id,
          metadata: payments.metadata,
          paidAt: payments.paidAt,
          provider: payments.provider,
          refundedAt: payments.refundedAt,
          status: payments.status,
          transactionId: payments.transactionId,
          updatedAt: payments.updatedAt,
          userEmail: sql<string>`(select u.email from users u where u.id = ${payments.userId})`,
          userId: payments.userId,
          userName: sql<string>`(select u.name from users u where u.id = ${payments.userId})`
        })
        .from(payments)
        .where(whereClause)
        .orderBy(sql`${payments.createdAt} desc`)
        .limit(input.limit)
        .offset(offset),
      db
        .select({ value: sql<number>`count(*)` })
        .from(payments)
        .where(whereClause)
    ]);

    return {
      items,
      total: Number(totalRows[0]?.value ?? 0)
    };
  }

  public async getAccountingStats(): Promise<PaymentDashboardStatsRecord> {
    const [row] = await db
      .select({
        pendingPayments: sql<number>`count(*) filter (where ${payments.status} = 'PENDING')`,
        refundedRevenue: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'REFUNDED'), '0')`,
        successfulPayments: sql<number>`count(*) filter (where ${payments.status} = 'SUCCESS')`,
        totalRevenue: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'SUCCESS'), '0')`
      })
      .from(payments);

    return {
      pendingPayments: Number(row?.pendingPayments ?? 0),
      refundedRevenue: Number(row?.refundedRevenue ?? "0"),
      successfulPayments: Number(row?.successfulPayments ?? 0),
      totalRevenue: Number(row?.totalRevenue ?? "0")
    };
  }

  public async findUserOwnedPayment(id: string, userId: string): Promise<PaymentRecord | null> {
    const [record] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, userId)))
      .limit(1);

    return record ? mapPaymentRecord(record) : null;
  }
}
