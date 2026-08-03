import type { Context } from "hono";
import type { UserRole } from "@genex/shared";

import type { MessageService } from "@/services/message-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class MessageController {
  public constructor(private readonly messageService: MessageService) {}

  public async listConversations(
    context: Context<AppBindings>,
    query: { search?: string | undefined },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.messageService.listConversations(query, currentUserId, currentUserRole);

    return success(context, data);
  }

  public async searchParticipants(
    context: Context<AppBindings>,
    query: { limit: number; search?: string | undefined },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.messageService.searchParticipants(query, currentUserId, currentUserRole);

    return success(context, data);
  }

  public async createConversation(
    context: Context<AppBindings>,
    input: { participantId: string },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.messageService.createConversation(input, currentUserId, currentUserRole);

    return success(context, data, 201, "Conversation ready");
  }

  public async reportConversation(
    context: Context<AppBindings>,
    conversationId: string,
    input: { reason: string },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.messageService.reportConversation(
      conversationId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 201, "Conversation reported for review");
  }

  public async reviewReportedConversation(
    context: Context<AppBindings>,
    conversationId: string,
    query: { cursor?: string | undefined; limit: number },
    adminId: string
  ): Promise<Response> {
    const data = await this.messageService.reviewReportedConversation(
      conversationId,
      query,
      adminId
    );

    return success(context, data);
  }

  public async hideMessage(
    context: Context<AppBindings>,
    messageId: string,
    adminId: string
  ): Promise<Response> {
    const data = await this.messageService.hideMessage(messageId, adminId);

    return success(context, data, 200, "Message hidden from participants");
  }

  public async listOpenReports(context: Context<AppBindings>): Promise<Response> {
    const data = await this.messageService.listOpenReports();

    return success(context, data);
  }

  public async resolveReport(
    context: Context<AppBindings>,
    reportId: string,
    adminId: string
  ): Promise<Response> {
    const data = await this.messageService.resolveReport(reportId, adminId);

    return success(context, data, 200, "Report resolved");
  }

  public async getConversationMessages(
    context: Context<AppBindings>,
    conversationId: string,
    query: { cursor?: string | undefined; limit: number },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.messageService.getConversationMessages(
      conversationId,
      query,
      currentUserId,
      currentUserRole
    );

    return success(context, data);
  }

  public async sendMessage(
    context: Context<AppBindings>,
    conversationId: string,
    input: { content: string },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.messageService.sendMessage(
      conversationId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 201, "Message sent");
  }

  public async markConversationRead(
    context: Context<AppBindings>,
    conversationId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.messageService.markConversationRead(
      conversationId,
      currentUserId,
      currentUserRole
    );

    return success(context, data ?? { conversationId, readMessageIds: [] });
  }
}
