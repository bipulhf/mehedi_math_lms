import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { uploadKindEnum, uploadPurposeEnum, uploadStatusEnum } from "./enums";
import { users } from "./users";

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: uploadPurposeEnum("purpose").notNull(),
    kind: uploadKindEnum("kind").notNull(),
    status: uploadStatusEnum("status").default("PENDING").notNull(),
    originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 255 }).notNull(),
    fileExtension: varchar("file_extension", { length: 32 }).notNull(),
    fileKey: text("file_key").notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationInSeconds: integer("duration_in_seconds"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("uploads_user_id_idx").on(table.userId),
    index("uploads_purpose_idx").on(table.purpose),
    index("uploads_status_idx").on(table.status),
    uniqueIndex("uploads_file_key_unique_idx").on(table.fileKey)
  ]
);
