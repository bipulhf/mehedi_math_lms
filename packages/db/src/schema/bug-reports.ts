import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { bugReportPriorityEnum, bugReportStatusEnum } from "./enums";
import { users } from "./users";

export const bugReports = pgTable(
  "bug_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    screenshotUrl: text("screenshot_url"),
    status: bugReportStatusEnum("status").default("OPEN").notNull(),
    priority: bugReportPriorityEnum("priority").default("MEDIUM").notNull(),
    adminNotes: text("admin_notes"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("bug_reports_user_id_idx").on(table.userId),
    index("bug_reports_status_idx").on(table.status),
    index("bug_reports_priority_idx").on(table.priority)
  ]
);
