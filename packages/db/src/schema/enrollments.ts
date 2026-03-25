import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { courses } from "./courses";
import { enrollmentStatusEnum } from "./enums";
import { lectures } from "./lectures";
import { users } from "./users";

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").default("ACTIVE").notNull(),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("enrollments_user_course_unique_idx").on(table.userId, table.courseId),
    index("enrollments_user_id_idx").on(table.userId),
    index("enrollments_course_id_idx").on(table.courseId)
  ]
);

export const courseProgress = pgTable(
  "course_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    lectureId: uuid("lecture_id")
      .notNull()
      .references(() => lectures.id, { onDelete: "cascade" }),
    isCompleted: boolean("is_completed").default(false).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("course_progress_enrollment_lecture_unique_idx").on(
      table.enrollmentId,
      table.lectureId
    ),
    index("course_progress_enrollment_id_idx").on(table.enrollmentId),
    index("course_progress_lecture_id_idx").on(table.lectureId)
  ]
);
