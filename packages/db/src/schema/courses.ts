import {
  boolean,
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { categories } from "./categories";
import { courseStatusEnum } from "./enums";
import { users } from "./users";

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description").notNull(),
    coverImageUrl: text("cover_image_url"),
    price: numeric("price", { precision: 10, scale: 2 }).default("0").notNull(),
    status: courseStatusEnum("status").default("DRAFT").notNull(),
    isExamOnly: boolean("is_exam_only").default(false).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("courses_slug_unique_idx").on(table.slug),
    index("courses_category_id_idx").on(table.categoryId),
    index("courses_creator_id_idx").on(table.creatorId),
    index("courses_status_idx").on(table.status)
  ]
);

export const courseTeachers = pgTable(
  "course_teachers",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.teacherId], name: "course_teachers_pk" }),
    index("course_teachers_course_id_idx").on(table.courseId),
    index("course_teachers_teacher_id_idx").on(table.teacherId)
  ]
);

export const notices = pgTable(
  "notices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("notices_course_id_idx").on(table.courseId),
    index("notices_teacher_id_idx").on(table.teacherId)
  ]
);
