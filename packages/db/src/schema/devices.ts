import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { deviceConflictStatusEnum } from "./enums";
import { users } from "./users";

/**
 * One row per device an account has ever signed in from, keyed by the id the
 * client generates and keeps for itself — localStorage in the browser,
 * secure-store on the phone. It is a history, not the enforcement surface:
 * what the limit counts is live sessions, and those are in `sessions`.
 */
export const userDevices = pgTable(
  "user_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    platform: varchar("platform", { length: 16 }).default("unknown").notNull(),
    userAgent: text("user_agent"),
    lastIpAddress: varchar("last_ip_address", { length: 64 }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("user_devices_user_device_unique_idx").on(table.userId, table.deviceId),
    index("user_devices_user_id_idx").on(table.userId),
    index("user_devices_last_seen_at_idx").on(table.lastSeenAt)
  ]
);

/**
 * A sign-in that was refused because the account already held sessions on its
 * full allowance of devices. This is the queue an administrator works: one
 * row is one person trying to get in from somewhere new, with enough beside it
 * to tell a shared password from a new phone.
 *
 * `reviewedBy` is `set null` for the same reason `audit_logs.actor_id` is —
 * the record of a decision should outlive the account that made it.
 */
export const deviceConflictLogs = pgTable(
  "device_conflict_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptedDeviceId: varchar("attempted_device_id", { length: 64 }),
    attemptedPlatform: varchar("attempted_platform", { length: 16 }).default("unknown").notNull(),
    attemptedUserAgent: text("attempted_user_agent"),
    attemptedIpAddress: varchar("attempted_ip_address", { length: 64 }),
    activeDeviceCount: integer("active_device_count").notNull(),
    deviceLimit: integer("device_limit").notNull(),
    status: deviceConflictStatusEnum("status").default("OPEN").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("device_conflict_logs_user_id_idx").on(table.userId),
    index("device_conflict_logs_status_idx").on(table.status),
    index("device_conflict_logs_created_at_idx").on(table.createdAt)
  ]
);
