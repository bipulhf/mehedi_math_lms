import { apiGet, apiPost } from "@/lib/api/client";
import type { ConversationMessage, MessageConversation } from "@/lib/api/messages";

/**
 * Admin-only message moderation. These endpoints live under `/admin` rather
 * than `/messages` because the messages router is restricted to students and
 * teachers -- an admin cannot reach anything mounted there. ADR-0004.
 */

export interface ConversationReportParticipant {
  id: string;
  name: string;
  role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
}

export interface ConversationReport {
  conversationId: string;
  createdAt: string;
  id: string;
  participants: readonly ConversationReportParticipant[];
  reason: string;
  reporter: ConversationReportParticipant;
  reporterId: string;
}

export interface ReportedConversationThread {
  conversation: MessageConversation;
  items: readonly ConversationMessage[];
  nextCursor: string | null;
}

export async function listConversationReports(): Promise<readonly ConversationReport[]> {
  const response = await apiGet<readonly ConversationReport[]>("admin/message-reports");

  return response.data;
}

/**
 * Reading a reported conversation writes an access-log row on the server. It is
 * not a free lookup -- do not call it to render a preview.
 */
export async function reviewReportedConversation(
  conversationId: string
): Promise<ReportedConversationThread> {
  const response = await apiGet<ReportedConversationThread>(
    `admin/message-reports/conversations/${conversationId}`
  );

  return response.data;
}

export async function resolveConversationReport(reportId: string): Promise<{ id: string }> {
  const response = await apiPost<Record<string, never>, { id: string }>(
    `admin/message-reports/${reportId}/resolve`,
    {}
  );

  return response.data;
}

export async function hideConversationMessage(messageId: string): Promise<ConversationMessage> {
  const response = await apiPost<Record<string, never>, ConversationMessage>(
    `admin/messages/${messageId}/hide`,
    {}
  );

  return response.data;
}
