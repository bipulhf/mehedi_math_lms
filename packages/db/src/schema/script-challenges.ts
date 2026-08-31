import { index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { scriptChallengeStatusEnum } from "./enums";
import { testSubmissions } from "./tests";
import { users } from "./users";

/**
 * A student's challenge against the marking on their written script.
 *
 * `assigned_teacher_id` is copied from `test_submissions.graded_by_id` at the
 * moment the challenge is raised rather than read back from the submission
 * later. The paper is reopened to be marked again, and a later re-submit
 * rewrites `graded_by_id` — reading it live would let the challenge drift onto
 * whoever happened to touch the paper last, which is the opposite of the rule
 * it exists to enforce.
 *
 * `score_at_challenge` is the mark the student was actually disputing. Kept
 * because the paper's own score is overwritten by the re-check, and without it
 * nobody can tell afterwards whether the second look changed anything.
 */
export const scriptChallenges = pgTable(
  "script_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => testSubmissions.id, { onDelete: "cascade" }),
    raisedById: uuid("raised_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedTeacherId: uuid("assigned_teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    status: scriptChallengeStatusEnum("status").default("OPEN").notNull(),
    response: text("response"),
    scoreAtChallenge: numeric("score_at_challenge", { mode: "number", precision: 7, scale: 2 }),
    scoreAfterReview: numeric("score_after_review", { mode: "number", precision: 7, scale: 2 }),
    resolvedById: uuid("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("script_challenges_submission_id_idx").on(table.submissionId),
    index("script_challenges_assigned_teacher_id_idx").on(table.assignedTeacherId),
    /**
     * One live challenge per paper, in the database rather than only in the
     * service: a student double-clicking the button would otherwise open two,
     * and the second would never be answered.
     */
    uniqueIndex("script_challenges_one_open_per_submission_idx")
      .on(table.submissionId)
      .where(sql`${table.status} = 'OPEN'`)
  ]
);
