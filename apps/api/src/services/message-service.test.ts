import { describe, expect, test } from "bun:test";

import type {
  ConversationMessageRecord,
  ConversationRecord,
  MessageRepository
} from "@/repositories/message-repository";
import { MessageService } from "@/services/message-service";
import type { MessageRealtimeService } from "@/services/message-realtime-service";
import { ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";

/**
 * ADR-0004. Teacher-student conversations are private and permanent. Reporting
 * one is the only thing that grants an admin the right to read it, every such
 * read is logged, and hiding a message tombstones it without destroying the
 * original.
 */

interface Overrides {
  hasOpenReport?: boolean;
  hiddenAt?: Date | null;
  messageMissing?: boolean;
}

interface Calls {
  accessLog: { adminId: string; conversationId: string }[];
  hidden: { hiddenById: string; messageId: string }[];
  reports: { reason: string; reporterId: string }[];
}

const student = { id: "student-1", image: null, isActive: true, name: "Student", role: "STUDENT" };
const teacher = { id: "teacher-1", image: null, isActive: true, name: "Teacher", role: "TEACHER" };

function buildService(overrides: Overrides = {}): { calls: Calls; service: MessageService } {
  const calls: Calls = { accessLog: [], hidden: [], reports: [] };

  const message = {
    content: "the original text",
    conversationId: "conv-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    hiddenAt: overrides.hiddenAt ?? null,
    id: "msg-1",
    readAt: null,
    sender: teacher,
    senderId: "teacher-1"
  } as unknown as ConversationMessageRecord;

  const conversation = {
    createdAt: new Date("2026-01-01T00:00:00Z"),
    id: "conv-1",
    lastMessage: message,
    lastMessageAt: new Date("2026-01-01T00:00:00Z"),
    participantOne: student,
    participantTwo: teacher,
    unreadCount: 0,
    updatedAt: new Date("2026-01-01T00:00:00Z")
  } as unknown as ConversationRecord;

  const messageRepository = {
    createConversationReport: async (input: { reason: string; reporterId: string }) => {
      calls.reports.push(input);

      return {
        conversationId: "conv-1",
        createdAt: new Date(),
        id: "report-1",
        reason: input.reason,
        reporterId: input.reporterId,
        resolvedAt: null,
        resolvedById: null
      };
    },
    findConversationById: async () => conversation,
    findMessageById: async () => (overrides.messageMissing ? null : message),
    hasOpenReport: async () => overrides.hasOpenReport ?? false,
    hideMessage: async (messageId: string, hiddenById: string) => {
      calls.hidden.push({ hiddenById, messageId });

      return overrides.hiddenAt ? null : { ...message, hiddenAt: new Date() };
    },
    listMessagesByConversation: async () => [message],
    recordAdminAccess: async (conversationId: string, adminId: string) => {
      calls.accessLog.push({ adminId, conversationId });
    }
  } as unknown as MessageRepository;

  const messageRealtimeService = {
    getOnlineUserIds: async () => new Set<string>()
  } as unknown as MessageRealtimeService;

  return { calls, service: new MessageService(messageRepository, messageRealtimeService) };
}

describe("MessageService.reportConversation", () => {
  test("a participant can report their conversation", async () => {
    const { calls, service } = buildService();
    const result = await service.reportConversation(
      "conv-1",
      { reason: "Inappropriate messages from the teacher" },
      "student-1",
      "STUDENT"
    );

    expect(result.id).toBe("report-1");
    expect(calls.reports[0]?.reporterId).toBe("student-1");
  });

  test("a non-participant cannot report", async () => {
    const { service } = buildService();

    await expect(
      service.reportConversation("conv-1", { reason: "some reason here" }, "student-9", "STUDENT")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("MessageService.reviewReportedConversation", () => {
  test("an unreported conversation stays private, even from an admin", async () => {
    const { calls, service } = buildService({ hasOpenReport: false });

    await expect(
      service.reviewReportedConversation("conv-1", { limit: 50 }, "admin-1")
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(calls.accessLog).toHaveLength(0);
  });

  test("an open report unlocks the conversation and the read is logged", async () => {
    const { calls, service } = buildService({ hasOpenReport: true });
    const result = await service.reviewReportedConversation("conv-1", { limit: 50 }, "admin-1");

    expect(result.items).toHaveLength(1);
    expect(calls.accessLog).toEqual([{ adminId: "admin-1", conversationId: "conv-1" }]);
  });

  test("an admin reviewing sees the original text of a hidden message", async () => {
    // Retaining the original is the point — someone responsible must still be
    // able to see what was said.
    const { service } = buildService({
      hasOpenReport: true,
      hiddenAt: new Date("2026-01-02T00:00:00Z")
    });
    const result = await service.reviewReportedConversation("conv-1", { limit: 50 }, "admin-1");

    expect(result.items[0]?.content).toBe("the original text");
    expect(result.items[0]?.isHidden).toBe(true);
  });
});

describe("MessageService — hidden messages are tombstoned for participants", () => {
  test("a participant sees a placeholder, never the original", async () => {
    const { service } = buildService({ hiddenAt: new Date("2026-01-02T00:00:00Z") });
    const result = await service.getConversationMessages(
      "conv-1",
      { limit: 50 },
      "student-1",
      "STUDENT"
    );

    expect(result.items[0]?.isHidden).toBe(true);
    expect(result.items[0]?.content).toBe("This message was removed by an administrator.");
    expect(result.items[0]?.content).not.toContain("original text");
  });

  test("a visible message is unchanged", async () => {
    const { service } = buildService();
    const result = await service.getConversationMessages(
      "conv-1",
      { limit: 50 },
      "student-1",
      "STUDENT"
    );

    expect(result.items[0]?.isHidden).toBe(false);
    expect(result.items[0]?.content).toBe("the original text");
  });
});

describe("MessageService.hideMessage", () => {
  test("hiding requires an open report on the conversation", async () => {
    const { calls, service } = buildService({ hasOpenReport: false });

    await expect(service.hideMessage("msg-1", "admin-1")).rejects.toBeInstanceOf(ForbiddenError);
    expect(calls.hidden).toHaveLength(0);
  });

  test("an admin can hide a message on a reported conversation", async () => {
    const { calls, service } = buildService({ hasOpenReport: true });
    const result = await service.hideMessage("msg-1", "admin-1");

    expect(calls.hidden).toEqual([{ hiddenById: "admin-1", messageId: "msg-1" }]);
    expect(result.isHidden).toBe(true);
  });

  test("an unknown message is rejected", async () => {
    const { service } = buildService({ hasOpenReport: true, messageMissing: true });

    await expect(service.hideMessage("msg-9", "admin-1")).rejects.toBeInstanceOf(NotFoundError);
  });

  test("hiding an already-hidden message is a conflict", async () => {
    const { service } = buildService({
      hasOpenReport: true,
      hiddenAt: new Date("2026-01-02T00:00:00Z")
    });

    await expect(service.hideMessage("msg-1", "admin-1")).rejects.toBeInstanceOf(ConflictError);
  });
});
