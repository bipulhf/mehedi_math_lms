import { index, jsonb, numeric, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

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
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
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
    index("payments_transaction_id_idx").on(table.transactionId)
  ]
);
