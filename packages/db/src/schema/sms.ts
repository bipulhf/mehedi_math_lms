import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { smsBatchStatusEnum, smsRecipientStatusEnum, smsTargetKindEnum, userRoleEnum } from "./enums";
import { courses } from "./courses";
import { users } from "./users";

export const smsBatches = pgTable(
  "sms_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    messageBody: text("message_body").notNull(),
    targetKind: smsTargetKindEnum("target_kind").notNull(),
    targetRole: userRoleEnum("target_role"),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    status: smsBatchStatusEnum("status").default("QUEUED").notNull(),
    providerLastResponse: text("provider_last_response"),
    totalRecipients: integer("total_recipients").default(0).notNull(),
    sentCount: integer("sent_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    skippedCount: integer("skipped_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [
    index("sms_batches_created_by_user_id_idx").on(table.createdByUserId),
    index("sms_batches_created_at_idx").on(table.createdAt),
    index("sms_batches_status_idx").on(table.status)
  ]
);

export const smsRecipients = pgTable(
  "sms_recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => smsBatches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    phoneE164: varchar("phone_e164", { length: 20 }),
    status: smsRecipientStatusEnum("status").default("PENDING").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("sms_recipients_batch_id_idx").on(table.batchId),
    index("sms_recipients_status_idx").on(table.status)
  ]
);
