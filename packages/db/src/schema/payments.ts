import { index, jsonb, numeric, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { coupons } from "./coupons";
import { courses } from "./courses";
import { enrollments } from "./enrollments";
import { paymentProviderEnum, paymentStatusEnum } from "./enums";
import { users } from "./users";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // The course being bought is known at checkout; the enrolment only exists
    // once the money clears, so it is filled in on settlement. ADR-0001.
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id").references(() => enrollments.id, {
      onDelete: "set null"
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The Payable: what the gateway was asked to collect, after any coupon. */
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    // The coupon and its arithmetic, snapshotted. A coupon stays editable for
    // its whole life, so what a buyer was actually charged can only be read
    // off the payment that charged them. This is also where uses are counted
    // from -- there is no redemption table. ADR-0013.
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    couponCode: varchar("coupon_code", { length: 32 }),
    /** The course price before the discount. Null when no coupon was used. */
    listAmount: numeric("list_amount", { precision: 10, scale: 2 }),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 8 }).default("BDT").notNull(),
    transactionId: varchar("transaction_id", { length: 255 }).notNull(),
    status: paymentStatusEnum("status").default("PENDING").notNull(),
    provider: paymentProviderEnum("provider").default("SSLCOMMERZ").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("payments_course_id_idx").on(table.courseId),
    index("payments_enrollment_id_idx").on(table.enrollmentId),
    index("payments_user_id_idx").on(table.userId),
    index("payments_transaction_id_idx").on(table.transactionId),
    // Every coupon usage figure is an aggregate over this column.
    index("payments_coupon_id_idx").on(table.couponId)
  ]
);
