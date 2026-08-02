/**
 * Row shapes and the mapping between them and the records the message feature
 * returns. Split out of `message-repository.ts` because both that repository
 * and `conversation-report-repository.ts` read them, and because they are the
 * one part of the feature with no query in it.
 */
import type { UserRole } from "@mma/shared";

export interface ParticipantUserRow {
  email: string;
  id: string;
  image: string | null;
  isActive: boolean;
  name: string;
  role: string;
  studentProfile: {
    profilePhoto: string | null;
  } | null;
  teacherProfile: {
    profilePhoto: string | null;
  } | null;
}

export interface MessageUserRow {
  id: string;
  image: string | null;
  name: string;
  role: string;
  studentProfile: {
    profilePhoto: string | null;
  } | null;
  teacherProfile: {
    profilePhoto: string | null;
  } | null;
}

export interface MessageRow {
  content: string;
  conversationId: string;
  createdAt: Date;
  hiddenAt: Date | null;
  id: string;
  readAt: Date | null;
  sender: MessageUserRow;
  senderId: string;
}

export interface MessageParticipantRecord {
  email: string;
  id: string;
  image: string | null;
  isActive: boolean;
  name: string;
  role: UserRole;
}

export interface ConversationReportRecord {
  conversationId: string;
  createdAt: Date;
  id: string;
  reason: string;
  reporterId: string;
  resolvedAt: Date | null;
  resolvedById: string | null;
}

/** A report with the people attached, so the admin queue is readable without a second round trip. */
export interface ConversationReportListRecord extends ConversationReportRecord {
  participants: readonly { id: string; name: string; role: UserRole }[];
  reporter: { id: string; name: string; role: UserRole };
}

export interface ConversationMessageRecord {
  content: string;
  conversationId: string;
  createdAt: Date;
  /** Set when an admin removed this message from view after a report. */
  hiddenAt: Date | null;
  id: string;
  readAt: Date | null;
  sender: MessageParticipantRecord;
  senderId: string;
}

export interface ConversationRecord {
  createdAt: Date;
  id: string;
  lastMessage: ConversationMessageRecord | null;
  lastMessageAt: Date | null;
  participantOne: MessageParticipantRecord;
  participantTwo: MessageParticipantRecord;
  unreadCount: number;
  updatedAt: Date;
}

export function resolveProfileImage(
  user:
    | {
        image: string | null;
        studentProfile: { profilePhoto: string | null } | null;
        teacherProfile: { profilePhoto: string | null } | null;
      }
    | MessageUserRow
    | ParticipantUserRow
): string | null {
  return user.teacherProfile?.profilePhoto ?? user.studentProfile?.profilePhoto ?? user.image;
}

export function mapParticipant(user: ParticipantUserRow): MessageParticipantRecord {
  return {
    email: user.email,
    id: user.id,
    image: resolveProfileImage(user),
    isActive: user.isActive,
    name: user.name,
    role: user.role as UserRole
  };
}

export function mapMessageParticipant(user: MessageUserRow): MessageParticipantRecord {
  return {
    email: "",
    id: user.id,
    image: resolveProfileImage(user),
    isActive: true,
    name: user.name,
    role: user.role as UserRole
  };
}

export function mapMessage(row: MessageRow): ConversationMessageRecord {
  return {
    content: row.content,
    conversationId: row.conversationId,
    createdAt: row.createdAt,
    hiddenAt: row.hiddenAt,
    id: row.id,
    readAt: row.readAt,
    sender: mapMessageParticipant(row.sender),
    senderId: row.senderId
  };
}

export function normalizeParticipantPair(userAId: string, userBId: string): {
  participantOneId: string;
  participantTwoId: string;
} {
  return userAId < userBId
    ? {
        participantOneId: userAId,
        participantTwoId: userBId
      }
    : {
        participantOneId: userBId,
        participantTwoId: userAId
      };
}
