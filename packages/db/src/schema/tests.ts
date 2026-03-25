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
import { questionTypeEnum, testSubmissionStatusEnum, testTypeEnum } from "./enums";
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
    passingScore: integer("passing_score"),
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
    type: questionTypeEnum("type").notNull(),
    questionText: text("question_text").notNull(),
    expectedAnswer: text("expected_answer"),
    correctAnswer: text("correct_answer"),
    marks: integer("marks").default(1).notNull(),
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
    score: integer("score"),
    maxScore: integer("max_score"),
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
    writtenAnswer: text("written_answer"),
    isCorrect: boolean("is_correct"),
    awardedMarks: integer("awarded_marks"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("submission_answers_submission_id_idx").on(table.submissionId),
    index("submission_answers_question_id_idx").on(table.questionId)
  ]
);
