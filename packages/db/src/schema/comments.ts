import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { lectures } from "./lectures";
import { users } from "./users";

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lectureId: uuid("lecture_id")
      .notNull()
      .references(() => lectures.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    content: text("content").notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("comments_lecture_id_idx").on(table.lectureId),
    index("comments_user_id_idx").on(table.userId),
    index("comments_parent_id_idx").on(table.parentId)
  ]
);
