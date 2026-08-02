import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    participantOneId: uuid("participant_one_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    participantTwoId: uuid("participant_two_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("conversations_participants_unique_idx").on(
      table.participantOneId,
      table.participantTwoId
    ),
    index("conversations_participant_one_id_idx").on(table.participantOneId),
    index("conversations_participant_two_id_idx").on(table.participantTwoId)
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    // Removed from view by an admin after a report. The content column is left
    // intact on purpose: the point is to stop the harm, not to destroy the
    // evidence of it. Participants can never set this. ADR-0004.
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenById: uuid("hidden_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_sender_id_idx").on(table.senderId),
    index("messages_created_at_idx").on(table.createdAt)
  ]
);

/**
 * A participant's report of a conversation. An open report — one with no
 * resolvedAt — is the only thing that grants an admin the right to read that
 * conversation. ADR-0004.
 */
export const conversationReports = pgTable(
  "conversation_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedById: uuid("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("conversation_reports_conversation_id_idx").on(table.conversationId),
    index("conversation_reports_reporter_id_idx").on(table.reporterId),
    index("conversation_reports_resolved_at_idx").on(table.resolvedAt)
  ]
);

/**
 * Every time an admin reads a reported conversation. The audit trail is part of
 * the control, not an extra: without it, "reporting unlocks access" decays into
 * "admins read whatever they can find a pretext for". ADR-0004.
 */
export const conversationAccessLog = pgTable(
  "conversation_access_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("conversation_access_log_conversation_id_idx").on(table.conversationId),
    index("conversation_access_log_admin_id_idx").on(table.adminId)
  ]
);
