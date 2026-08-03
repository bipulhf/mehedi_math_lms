import type { UserRole } from "@genex/shared";

import type { ConversationReportRepository } from "@/repositories/conversation-report-repository";
import type {
  ConversationMessageRecord,
  ConversationRecord,
  MessageParticipantRecord
} from "@/repositories/message-record-mappers";
import type { MessageRepository } from "@/repositories/message-repository";
import type { MessageRealtimeService } from "@/services/message-realtime-service";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface MessageParticipantView {
  id: string;
  image: string | null;
  isOnline: boolean;
  name: string;
  role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
}

export interface ConversationMessageView {
  content: string;
  conversationId: string;
  createdAt: string;
  id: string;
  /** True when an admin removed this message; content is a tombstone. */
  isHidden: boolean;
  isOwn: boolean;
  readAt: string | null;
  sender: MessageParticipantView;
  senderId: string;
}

export interface ConversationView {
  createdAt: string;
  id: string;
  lastMessage: ConversationMessageView | null;
  lastMessageAt: string | null;
  unreadCount: number;
  updatedAt: string;
  user: MessageParticipantView;
}

/** What the admin moderation queue shows: who reported whom, and why. */
export interface ConversationReportView {
  conversationId: string;
  createdAt: string;
  id: string;
  participants: readonly { id: string; name: string; role: UserRole }[];
  reason: string;
  reporter: { id: string; name: string; role: UserRole };
  reporterId: string;
}

interface ConversationMessagesView {
  conversation: ConversationView;
  items: readonly ConversationMessageView[];
  nextCursor: string | null;
}

interface ReadConversationResult {
  conversationId: string;
  readAt: string;
  readMessageIds: readonly string[];
  userIds: readonly string[];
}

interface TypingEventResult {
  conversationId: string;
  type: "typing:start" | "typing:stop";
  userId: string;
  userIds: readonly string[];
}

function requireMessagingRole(role: UserRole): "STUDENT" | "TEACHER" {
  if (role !== "STUDENT" && role !== "TEACHER") {
    throw new ForbiddenError("Messaging is only available for students and teachers");
  }

  return role;
}

function mapParticipantView(
  participant: MessageParticipantRecord,
  onlineUserIds: ReadonlySet<string>
): MessageParticipantView {
  return {
    id: participant.id,
    image: participant.image,
    isOnline: onlineUserIds.has(participant.id),
    name: participant.name,
    role: participant.role
  };
}

const HIDDEN_MESSAGE_PLACEHOLDER = "This message was removed by an administrator.";

/**
 * A hidden message renders as a tombstone. The original text is retained in the
 * database for the record, but it is replaced here so it can never reach a
 * participant again — including over the WebSocket, which maps through this
 * same function. Admins reviewing a reported conversation see the original.
 * ADR-0004.
 */
function mapMessageView(
  message: ConversationMessageRecord,
  currentUserId: string,
  onlineUserIds: ReadonlySet<string>,
  options: { revealHidden?: boolean } = {}
): ConversationMessageView {
  const isHidden = message.hiddenAt !== null;

  return {
    content: isHidden && !options.revealHidden ? HIDDEN_MESSAGE_PLACEHOLDER : message.content,
    conversationId: message.conversationId,
    createdAt: message.createdAt.toISOString(),
    id: message.id,
    isHidden,
    isOwn: message.senderId === currentUserId,
    readAt: message.readAt ? message.readAt.toISOString() : null,
    sender: mapParticipantView(message.sender, onlineUserIds),
    senderId: message.senderId
  };
}

export class MessageService {
  public constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationReportRepository: ConversationReportRepository,
    private readonly messageRealtimeService: MessageRealtimeService
  ) {}

  private async getOnlineUserIds(conversations: readonly ConversationRecord[]): Promise<ReadonlySet<string>> {
    const participantIds = conversations.flatMap((conversation) => [
      conversation.participantOne.id,
      conversation.participantTwo.id
    ]);

    return this.messageRealtimeService.getOnlineUserIds([...new Set(participantIds)]);
  }

  private mapConversationView(
    conversation: ConversationRecord,
    currentUserId: string,
    onlineUserIds: ReadonlySet<string>
  ): ConversationView {
    const counterpart =
      conversation.participantOne.id === currentUserId
        ? conversation.participantTwo
        : conversation.participantOne;

    return {
      createdAt: conversation.createdAt.toISOString(),
      id: conversation.id,
      lastMessage: conversation.lastMessage
        ? mapMessageView(conversation.lastMessage, currentUserId, onlineUserIds)
        : null,
      lastMessageAt: conversation.lastMessageAt ? conversation.lastMessageAt.toISOString() : null,
      unreadCount: conversation.unreadCount,
      updatedAt: conversation.updatedAt.toISOString(),
      user: mapParticipantView(counterpart, onlineUserIds)
    };
  }

  private async requireConversationAccess(
    conversationId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ConversationRecord> {
    requireMessagingRole(currentUserRole);

    const conversation = await this.messageRepository.findConversationById(conversationId, currentUserId);

    if (!conversation) {
      throw new NotFoundError("Conversation not found");
    }

    if (
      conversation.participantOne.id !== currentUserId &&
      conversation.participantTwo.id !== currentUserId
    ) {
      throw new ForbiddenError("You do not have access to this conversation");
    }

    return conversation;
  }

  /**
   * An admin may read one conversation, and only while a report about it is
   * open. Unreported conversations stay private to the two people in them, and
   * every read that does happen is written to the access log. ADR-0004.
   */
  private async requireReportedConversationAccess(
    conversationId: string,
    adminId: string
  ): Promise<ConversationRecord> {
    const conversation = await this.messageRepository.findConversationById(conversationId, adminId);

    if (!conversation) {
      throw new NotFoundError("Conversation not found");
    }

    const isReported = await this.conversationReportRepository.hasOpenReport(conversationId);

    if (!isReported) {
      throw new ForbiddenError("This conversation has not been reported");
    }

    await this.conversationReportRepository.recordAdminAccess(conversationId, adminId);

    return conversation;
  }

  private async validateParticipantPair(
    currentUserId: string,
    currentUserRole: "STUDENT" | "TEACHER",
    participantId: string
  ): Promise<MessageParticipantRecord> {
    if (participantId === currentUserId) {
      throw new ValidationError("You cannot start a conversation with yourself", [
        {
          field: "participantId",
          message: "Choose another person"
        }
      ]);
    }

    const participant = await this.messageRepository.findActiveUserById(participantId);

    if (!participant || !participant.isActive) {
      throw new NotFoundError("Participant not found");
    }

    const isAllowedPair =
      (currentUserRole === "STUDENT" && participant.role === "TEACHER") ||
      (currentUserRole === "TEACHER" && participant.role === "STUDENT");

    if (!isAllowedPair) {
      throw new ForbiddenError("Conversations are only allowed between students and teachers");
    }

    // The search endpoint already hides everyone outside the enrolment, but the
    // participant id arrives from the client, so the rule is enforced here too —
    // a filtered list is a convenience, not an authorisation check.
    const studentId = currentUserRole === "STUDENT" ? currentUserId : participantId;
    const teacherId = currentUserRole === "STUDENT" ? participantId : currentUserId;
    const isEnrolledTogether = await this.messageRepository.shareLiveEnrollment(
      studentId,
      teacherId
    );

    if (!isEnrolledTogether) {
      throw new ForbiddenError(
        currentUserRole === "STUDENT"
          ? "You can only message teachers of courses you are enrolled in"
          : "You can only message students enrolled in your courses"
      );
    }

    return participant;
  }

  public async listConversations(
    query: { search?: string | undefined },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly ConversationView[]> {
    requireMessagingRole(currentUserRole);

    const conversations = await this.messageRepository.listConversationsForUser(currentUserId, query.search);
    const onlineUserIds = await this.getOnlineUserIds(conversations);

    return conversations.map((conversation) =>
      this.mapConversationView(conversation, currentUserId, onlineUserIds)
    );
  }

  public async searchParticipants(
    query: { limit: number; search?: string | undefined },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly MessageParticipantView[]> {
    const messagingRole = requireMessagingRole(currentUserRole);
    const participants = await this.messageRepository.searchEligibleParticipants({
      currentUserId,
      currentUserRole: messagingRole,
      limit: query.limit,
      search: query.search
    });
    const onlineUserIds = await this.messageRealtimeService.getOnlineUserIds(
      participants.map((participant) => participant.id)
    );

    return participants.map((participant) => mapParticipantView(participant, onlineUserIds));
  }

  public async createConversation(
    input: { participantId: string },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ConversationView> {
    const messagingRole = requireMessagingRole(currentUserRole);
    await this.validateParticipantPair(currentUserId, messagingRole, input.participantId);

    const existingConversation = await this.messageRepository.findConversationBetweenUsers(
      currentUserId,
      input.participantId,
      currentUserId
    );
    const conversation =
      existingConversation ?? (await this.messageRepository.createConversation(currentUserId, input.participantId));
    const onlineUserIds = await this.messageRealtimeService.getOnlineUserIds([
      conversation.participantOne.id,
      conversation.participantTwo.id
    ]);

    return this.mapConversationView(conversation, currentUserId, onlineUserIds);
  }

  public async getConversationMessages(
    conversationId: string,
    query: { cursor?: string | undefined; limit: number },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ConversationMessagesView> {
    const conversation = await this.requireConversationAccess(conversationId, currentUserId, currentUserRole);
    const [messages, onlineUserIds] = await Promise.all([
      this.messageRepository.listMessagesByConversation({
        conversationId,
        cursor: query.cursor,
        limit: query.limit
      }),
      this.messageRealtimeService.getOnlineUserIds([
        conversation.participantOne.id,
        conversation.participantTwo.id
      ])
    ]);
    const ordered = [...messages].reverse();
    const nextCursor = messages.length === query.limit ? ordered[0]?.createdAt.toISOString() ?? null : null;

    return {
      conversation: this.mapConversationView(conversation, currentUserId, onlineUserIds),
      items: ordered.map((message) => mapMessageView(message, currentUserId, onlineUserIds)),
      nextCursor
    };
  }

  /**
   * Either participant can report their conversation. This is the only thing
   * that grants an admin the right to read it. ADR-0004.
   */
  public async reportConversation(
    conversationId: string,
    input: { reason: string },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ conversationId: string; id: string }> {
    await this.requireConversationAccess(conversationId, currentUserId, currentUserRole);

    const report = await this.conversationReportRepository.createConversationReport({
      conversationId,
      reason: input.reason.trim(),
      reporterId: currentUserId
    });

    return { conversationId: report.conversationId, id: report.id };
  }

  /**
   * Admin review of a reported conversation. Shows the original text of hidden
   * messages, because the point of retaining them is that someone responsible
   * can still see what was said. Writes an access-log row. ADR-0004.
   */
  public async reviewReportedConversation(
    conversationId: string,
    query: { cursor?: string | undefined; limit: number },
    adminId: string
  ): Promise<ConversationMessagesView> {
    const conversation = await this.requireReportedConversationAccess(conversationId, adminId);
    const messages = await this.messageRepository.listMessagesByConversation({
      conversationId,
      cursor: query.cursor,
      limit: query.limit
    });
    const ordered = [...messages].reverse();
    const nextCursor =
      messages.length === query.limit ? ordered[0]?.createdAt.toISOString() ?? null : null;
    const onlineUserIds: ReadonlySet<string> = new Set<string>();

    return {
      conversation: this.mapConversationView(conversation, adminId, onlineUserIds),
      items: ordered.map((message) =>
        mapMessageView(message, adminId, onlineUserIds, { revealHidden: true })
      ),
      nextCursor
    };
  }

  /**
   * Remove a message from view. Only an admin, only on a reported conversation.
   * The original row survives — hiding stops the harm, it does not erase the
   * evidence. ADR-0004.
   */
  public async hideMessage(
    messageId: string,
    adminId: string
  ): Promise<ConversationMessageView> {
    const message = await this.messageRepository.findMessageById(messageId);

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    await this.requireReportedConversationAccess(message.conversationId, adminId);

    const hidden = await this.messageRepository.hideMessage(messageId, adminId);

    if (!hidden) {
      throw new ConflictError("Message is already hidden");
    }

    return mapMessageView(hidden, adminId, new Set<string>(), { revealHidden: true });
  }

  public async listOpenReports(): Promise<readonly ConversationReportView[]> {
    const reports = await this.conversationReportRepository.listOpenReports();

    return reports.map((report) => ({
      conversationId: report.conversationId,
      createdAt: report.createdAt.toISOString(),
      id: report.id,
      participants: report.participants,
      reason: report.reason,
      reporter: report.reporter,
      reporterId: report.reporterId
    }));
  }

  public async resolveReport(reportId: string, adminId: string): Promise<{ id: string }> {
    const resolved = await this.conversationReportRepository.resolveReport(reportId, adminId);

    if (!resolved) {
      throw new NotFoundError("Open report not found");
    }

    return { id: resolved.id };
  }

  public async sendMessage(
    conversationId: string,
    input: { content: string },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ConversationMessageView> {
    const conversation = await this.requireConversationAccess(conversationId, currentUserId, currentUserRole);
    const message = await this.messageRepository.createMessage(conversation.id, currentUserId, input.content.trim());
    const userIds = [conversation.participantOne.id, conversation.participantTwo.id] as const;
    const onlineUserIds = await this.messageRealtimeService.getOnlineUserIds(userIds);
    const mappedMessage = mapMessageView(message, currentUserId, onlineUserIds);

    await this.messageRealtimeService.publish({
      conversationId,
      data: {
        content: mappedMessage.content,
        createdAt: mappedMessage.createdAt,
        id: mappedMessage.id,
        readAt: mappedMessage.readAt,
        senderId: mappedMessage.senderId
      },
      type: "message:new",
      userIds
    });

    return mappedMessage;
  }

  public async markConversationRead(
    conversationId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ReadConversationResult | null> {
    const conversation = await this.requireConversationAccess(conversationId, currentUserId, currentUserRole);
    const readMessages = await this.messageRepository.markConversationRead(conversation.id, currentUserId);

    if (readMessages.length === 0) {
      return null;
    }

    const readAt = readMessages[0]?.readAt;

    if (!readAt) {
      return null;
    }

    const result = {
      conversationId,
      readAt: readAt.toISOString(),
      readMessageIds: readMessages.map((message) => message.id),
      userIds: [conversation.participantOne.id, conversation.participantTwo.id] as const
    };

    await this.messageRealtimeService.publish({
      conversationId,
      data: {
        readAt: result.readAt,
        readMessageIds: result.readMessageIds,
        userId: currentUserId
      },
      type: "message:read",
      userIds: result.userIds
    });

    return result;
  }

  public async prepareTypingEvent(
    conversationId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    type: "typing:start" | "typing:stop"
  ): Promise<TypingEventResult> {
    const conversation = await this.requireConversationAccess(conversationId, currentUserId, currentUserRole);

    return {
      conversationId,
      type,
      userId: currentUserId,
      userIds: [conversation.participantOne.id, conversation.participantTwo.id]
    };
  }
}
