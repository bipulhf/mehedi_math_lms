import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { deviceTypeEnum, notificationTypeEnum } from "./enums";
import { users } from "./users";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    type: notificationTypeEnum("type").default("SYSTEM").notNull(),
    data: jsonb("data").$type<Record<string, string | number | boolean | null>>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_created_at_idx").on(table.createdAt)
  ]
);

export const fcmTokens = pgTable(
  "fcm_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    deviceType: deviceTypeEnum("device_type").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("fcm_tokens_token_unique_idx").on(table.token),
    index("fcm_tokens_user_id_idx").on(table.userId)
  ]
);
