import {
  conversationMessagesQuerySchema,
  createConversationSchema,
  messageParticipantsQuerySchema,
  messagesConversationQuerySchema,
  sendMessageSchema
} from "@mma/shared";
import type { z } from "zod";

import { apiGet, apiPost } from "@/lib/api/client";

export const MESSAGES_UNREAD_EVENT = "mma:messages-unread";

export interface MessageParticipant {
  id: string;
  image: string | null;
  isOnline: boolean;
  name: string;
  role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
}

export interface ConversationMessage {
  content: string;
  conversationId: string;
  createdAt: string;
  id: string;
  isOwn: boolean;
  readAt: string | null;
  sender: MessageParticipant;
  senderId: string;
}

export interface MessageConversation {
  createdAt: string;
  id: string;
  lastMessage: ConversationMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  updatedAt: string;
  user: MessageParticipant;
}

export interface MessageConversationThread {
  conversation: MessageConversation;
  items: readonly ConversationMessage[];
  nextCursor: string | null;
}

export interface MarkConversationReadResponse {
  conversationId: string;
  readAt?: string;
  readMessageIds: readonly string[];
}

export type MessageConversationsQuery = z.infer<typeof messagesConversationQuerySchema>;
export type MessageParticipantsQuery = z.infer<typeof messageParticipantsQuerySchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ConversationMessagesQuery = z.infer<typeof conversationMessagesQuerySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

function buildQueryString(
  query: Record<string, number | string | undefined>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

export async function listMessageConversations(
  query: Partial<MessageConversationsQuery> = {}
): Promise<readonly MessageConversation[]> {
  const response = await apiGet<readonly MessageConversation[]>(
    `messages/conversations${buildQueryString({
      search: query.search
    })}`
  );

  return response.data;
}

export async function searchMessageParticipants(
  query: Partial<MessageParticipantsQuery> = {}
): Promise<readonly MessageParticipant[]> {
  const response = await apiGet<readonly MessageParticipant[]>(
    `messages/participants${buildQueryString({
      limit: query.limit,
      search: query.search
    })}`
  );

  return response.data;
}

export async function createConversation(input: CreateConversationInput): Promise<MessageConversation> {
  const response = await apiPost<CreateConversationInput, MessageConversation>(
    "messages/conversations",
    input
  );

  return response.data;
}

export async function getConversationMessages(
  conversationId: string,
  query: Partial<ConversationMessagesQuery> = {}
): Promise<MessageConversationThread> {
  const response = await apiGet<MessageConversationThread>(
    `messages/conversations/${conversationId}${buildQueryString({
      cursor: query.cursor,
      limit: query.limit
    })}`
  );

  return response.data;
}

export async function sendConversationMessage(
  conversationId: string,
  input: SendMessageInput
): Promise<ConversationMessage> {
  const response = await apiPost<SendMessageInput, ConversationMessage>(
    `messages/conversations/${conversationId}`,
    input
  );

  return response.data;
}

export async function markConversationRead(conversationId: string): Promise<MarkConversationReadResponse> {
  const response = await apiPost<Record<string, never>, MarkConversationReadResponse>(
    `messages/conversations/${conversationId}/read`,
    {}
  );

  return response.data;
}
