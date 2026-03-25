import { index, jsonb, numeric, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { enrollments } from "./enrollments";
import { paymentProviderEnum, paymentStatusEnum } from "./enums";
import { users } from "./users";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
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
    index("payments_enrollment_id_idx").on(table.enrollmentId),
    index("payments_user_id_idx").on(table.userId),
    index("payments_transaction_id_idx").on(table.transactionId)
  ]
);
