import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { chapters } from "./chapters";
import { lectureTypeEnum } from "./enums";

export const lectures = pgTable(
  "lectures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    type: lectureTypeEnum("type").notNull(),
    videoUrl: text("video_url"),
    videoDuration: integer("video_duration"),
    content: text("content"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPreview: boolean("is_preview").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("lectures_chapter_id_idx").on(table.chapterId),
    index("lectures_sort_order_idx").on(table.sortOrder)
  ]
);

export const lectureMaterials = pgTable(
  "lecture_materials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lectureId: uuid("lecture_id")
      .notNull()
      .references(() => lectures.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: varchar("file_type", { length: 64 }).notNull(),
    fileSize: integer("file_size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("lecture_materials_lecture_id_idx").on(table.lectureId)]
);
