import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { courses } from "./courses";
import { couponKindEnum } from "./enums";
import { users } from "./users";

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Stored uppercase. Every lookup uppercases first, so "save20" finds
    // "SAVE20" -- a code handed out on paper is never typed the way it was
    // written.
    code: varchar("code", { length: 32 }).notNull(),
    // NULL is a Platform Coupon: every course, including ones published after
    // it was made. Only an Admin may write NULL here. ADR-0013.
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    kind: couponKindEnum("kind").notNull(),
    // Taka for FLAT, percent for PERCENT. One column, because a coupon is one
    // kind for its whole life.
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    /** NULL is uncapped. Uses are counted off `payments`, never stored. ADR-0013. */
    maxRedemptions: integer("max_redemptions"),
    /** Advertised on the course page rather than handed out privately. */
    isPublic: boolean("is_public").default(false).notNull(),
    isDisabled: boolean("is_disabled").default(false).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    // Two partial indexes rather than one composite: Postgres treats NULLs as
    // distinct, so `unique (course_id, code)` would let two Platform Coupons
    // share a code and leave checkout with no way to choose between them.
    uniqueIndex("coupons_course_code_unique_idx")
      .on(table.courseId, sql`upper(${table.code})`)
      .where(sql`${table.courseId} is not null`),
    uniqueIndex("coupons_platform_code_unique_idx")
      .on(sql`upper(${table.code})`)
      .where(sql`${table.courseId} is null`),
    index("coupons_course_id_idx").on(table.courseId),
    index("coupons_created_by_id_idx").on(table.createdById)
  ]
);
