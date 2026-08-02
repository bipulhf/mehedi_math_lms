import { z } from "zod";

import { idSchema, nonEmptyStringSchema } from "./common";

export const messagesConversationQuerySchema = z.object({
  search: z.string().trim().max(120).optional()
});

export const messageParticipantsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(20).default(8),
  search: z.string().trim().max(120).optional()
});

export const messageConversationIdParamsSchema = z.object({
  id: idSchema
});

export const createConversationSchema = z.object({
  participantId: idSchema
});

export const conversationMessagesQuerySchema = z.object({
  cursor: z.iso.datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).default(30)
});

export const sendMessageSchema = z.object({
  content: nonEmptyStringSchema.max(4000)
});

export const websocketClientEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("typing:start"),
    conversationId: idSchema
  }),
  z.object({
    type: z.literal("typing:stop"),
    conversationId: idSchema
  }),
  z.object({
    type: z.literal("message:read"),
    conversationId: idSchema
  })
]);

export type MessagesConversationQuery = z.infer<typeof messagesConversationQuerySchema>;
export type MessageParticipantsQuery = z.infer<typeof messageParticipantsQuerySchema>;
export type MessageConversationIdParams = z.infer<typeof messageConversationIdParamsSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ConversationMessagesQuery = z.infer<typeof conversationMessagesQuerySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type WebsocketClientEvent = z.infer<typeof websocketClientEventSchema>;

/**
 * Reporting a conversation is what grants an admin the right to read it, so a
 * reason is mandatory — it is the record of why the privacy exception applies.
 * ADR-0004.
 */
export const reportConversationSchema = z.object({
  reason: z.string().trim().min(10).max(2000)
});

export type ReportConversationInput = z.infer<typeof reportConversationSchema>;
