import { apiGet, apiPost, buildQueryString } from "@/src/lib/api-client";

/** Conversations, their messages, and reporting one. */

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
  isHidden: boolean;
  isOwn: boolean;
  readAt: string | null;
  sender: MessageParticipant;
  senderId: string;
}

export interface MessageConversation {
  id: string;
  lastMessage: ConversationMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  user: MessageParticipant;
}

export interface ConversationThread {
  conversation: MessageConversation;
  items: readonly ConversationMessage[];
  nextCursor: string | null;
}

export async function listConversations(): Promise<readonly MessageConversation[]> {
  return apiGet<readonly MessageConversation[]>("messages/conversations");
}

export async function searchMessageParticipants(
  search: string
): Promise<readonly MessageParticipant[]> {
  return apiGet<readonly MessageParticipant[]>(
    `messages/participants${buildQueryString({ limit: 20, search })}`
  );
}

export async function createConversation(input: {
  participantId: string;
}): Promise<MessageConversation> {
  return apiPost<{ participantId: string }, MessageConversation>("messages/conversations", input);
}

export async function getConversation(conversationId: string): Promise<ConversationThread> {
  return apiGet<ConversationThread>(
    `messages/conversations/${conversationId}${buildQueryString({ limit: 40 })}`
  );
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<ConversationMessage> {
  return apiPost<{ content: string }, ConversationMessage>(
    `messages/conversations/${conversationId}`,
    { content }
  );
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiPost(`messages/conversations/${conversationId}/read`);
}

export async function reportConversation(
  conversationId: string,
  reason: string
): Promise<{ id: string }> {
  return apiPost<{ reason: string }, { id: string }>(
    `messages/conversations/${conversationId}/report`,
    { reason }
  );
}
