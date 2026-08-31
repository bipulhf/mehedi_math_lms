import { pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { courses } from "./courses";
import { users } from "./users";

/**
 * A course's routine — the class schedule its students read.
 *
 * One row per course rather than a list: a routine is the current state of the
 * timetable, not a feed of them, so publishing a new one replaces the old one
 * instead of stacking beside it. The unique index on `course_id` is what makes
 * that true in the database rather than only in the service.
 *
 * A routine may be written out, attached as a PDF, or both — neither column is
 * required on its own, and the "at least one" rule lives in
 * `upsertCourseRoutineSchema` because it is a statement about the request.
 */
export const courseRoutines = pgTable(
  "course_routines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    content: text("content"),
    attachmentUrl: varchar("attachment_url", { length: 2048 }),
    attachmentName: varchar("attachment_name", { length: 255 }),
    updatedById: uuid("updated_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex("course_routines_course_id_idx").on(table.courseId)]
);
