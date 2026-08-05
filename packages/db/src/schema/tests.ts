import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { chapters } from "./chapters";
import { testSubmissionStatusEnum, testTypeEnum } from "./enums";
import { uploads } from "./uploads";
import { users } from "./users";

export const tests = pgTable(
  "tests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    durationInMinutes: integer("duration_in_minutes"),
    // Marks carry two decimal places everywhere: half marks are ordinary in
    // maths marking. ADR-0008.
    passingScore: numeric("passing_score", { mode: "number", precision: 7, scale: 2 }),
    maxAttempts: integer("max_attempts"),
    lockAnswerOnSelect: boolean("lock_answer_on_select").default(false).notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    type: testTypeEnum("type").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("tests_chapter_id_idx").on(table.chapterId),
    index("tests_sort_order_idx").on(table.sortOrder)
  ]
);

export const testQuestions = pgTable(
  "test_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    questionText: text("question_text").notNull(),
    /** Model answer and mark breakdown. Staff only -- never sent to a student. */
    markingGuide: text("marking_guide"),
    marks: numeric("marks", { mode: "number", precision: 5, scale: 2 })
      .default(1)
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("test_questions_test_id_idx").on(table.testId),
    index("test_questions_sort_order_idx").on(table.sortOrder)
  ]
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => testQuestions.id, { onDelete: "cascade" }),
    optionText: text("option_text").notNull(),
    isCorrect: boolean("is_correct").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("question_options_question_id_idx").on(table.questionId),
    index("question_options_sort_order_idx").on(table.sortOrder)
  ]
);

export const testSubmissions = pgTable(
  "test_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gradedById: uuid("graded_by_id").references(() => users.id, { onDelete: "set null" }),
    status: testSubmissionStatusEnum("status").default("STARTED").notNull(),
    score: numeric("score", { mode: "number", precision: 7, scale: 2 }),
    maxScore: numeric("max_score", { mode: "number", precision: 7, scale: 2 }),
    feedback: text("feedback"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("test_submissions_test_id_idx").on(table.testId),
    index("test_submissions_user_id_idx").on(table.userId),
    index("test_submissions_graded_by_id_idx").on(table.gradedById)
  ]
);

export const submissionAnswers = pgTable(
  "submission_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => testSubmissions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => testQuestions.id, { onDelete: "cascade" }),
    selectedOptionId: uuid("selected_option_id").references(() => questionOptions.id, {
      onDelete: "set null"
    }),
    isCorrect: boolean("is_correct"),
    awardedMarks: numeric("awarded_marks", { mode: "number", precision: 5, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("submission_answers_submission_id_idx").on(table.submissionId),
    index("submission_answers_question_id_idx").on(table.questionId),
    /**
     * One answer row per question per submission, so Script Pages can hang off
     * a row that survives every autosave. Answers are upserted against this,
     * never deleted and re-inserted.
     */
    uniqueIndex("submission_answers_submission_question_unique_idx").on(
      table.submissionId,
      table.questionId
    )
  ]
);

/**
 * One photographed page of an Answer Script, in the order the student wrote it.
 *
 * `marking` is the teacher's Marking over this page: a versioned document of
 * elements with coordinates normalised 0-1, drawn on top rather than baked into
 * the image. Null means the page has not been marked on. ADR-0010.
 */
export const scriptPages = pgTable(
  "script_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionAnswerId: uuid("submission_answer_id")
      .notNull()
      .references(() => submissionAnswers.id, { onDelete: "cascade" }),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => uploads.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    marking: jsonb("marking"),
    markedAt: timestamp("marked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("script_pages_submission_answer_id_idx").on(table.submissionAnswerId),
    index("script_pages_sort_order_idx").on(table.sortOrder),
    uniqueIndex("script_pages_upload_id_unique_idx").on(table.uploadId)
  ]
);

/** Diagrams and photographed question papers attached to a Question. */
export const questionImages = pgTable(
  "question_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => testQuestions.id, { onDelete: "cascade" }),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => uploads.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("question_images_question_id_idx").on(table.questionId),
    index("question_images_sort_order_idx").on(table.sortOrder),
    uniqueIndex("question_images_upload_id_unique_idx").on(table.uploadId)
  ]
);

/**
 * A teacher's claim on one answer of one paper while they mark it.
 *
 * The lock is per answer, not per submission, because the two review orders run
 * at once: one teacher works down a single student's paper while another sweeps
 * one question across every student. Expiry is absolute -- a dead browser tab
 * releases its claim by simply not renewing.
 */
export const answerMarkingLocks = pgTable(
  "answer_marking_locks",
  {
    submissionAnswerId: uuid("submission_answer_id")
      .primaryKey()
      .references(() => submissionAnswers.id, { onDelete: "cascade" }),
    lockedById: uuid("locked_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("answer_marking_locks_locked_by_id_idx").on(table.lockedById),
    index("answer_marking_locks_expires_at_idx").on(table.expiresAt)
  ]
);
