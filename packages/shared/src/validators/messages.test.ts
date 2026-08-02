import { describe, expect, test } from "bun:test";

import {
  conversationMessagesQuerySchema,
  createConversationSchema,
  messageParticipantsQuerySchema,
  reportConversationSchema,
  sendMessageSchema,
  websocketClientEventSchema
} from "./messages";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("sendMessageSchema", () => {
  test("trims, and a message of only whitespace is not a message", () => {
    expect(sendMessageSchema.parse({ content: "  hello  " }).content).toBe("hello");
    expect(sendMessageSchema.safeParse({ content: "   " }).success).toBe(false);
  });

  test("stops at 4000 characters", () => {
    expect(sendMessageSchema.safeParse({ content: "a".repeat(4000) }).success).toBe(true);
    expect(sendMessageSchema.safeParse({ content: "a".repeat(4001) }).success).toBe(false);
  });
});

describe("createConversationSchema", () => {
  test("names the other participant by uuid", () => {
    expect(createConversationSchema.parse({ participantId: UUID }).participantId).toBe(UUID);
    expect(createConversationSchema.safeParse({ participantId: "teacher" }).success).toBe(false);
  });
});

describe("conversationMessagesQuerySchema", () => {
  test("defaults to thirty messages and caps at a hundred", () => {
    expect(conversationMessagesQuerySchema.parse({}).limit).toBe(30);
    expect(conversationMessagesQuerySchema.safeParse({ limit: "100" }).success).toBe(true);
    expect(conversationMessagesQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  test("the cursor is an ISO timestamp, because that is what it pages on", () => {
    expect(
      conversationMessagesQuerySchema.safeParse({ cursor: "2026-03-25T10:00:00.000Z" }).success
    ).toBe(true);
    expect(conversationMessagesQuerySchema.safeParse({ cursor: "2026-03-25" }).success).toBe(false);
  });
});

describe("messageParticipantsQuerySchema", () => {
  test("defaults to eight suggestions and caps at twenty", () => {
    expect(messageParticipantsQuerySchema.parse({}).limit).toBe(8);
    expect(messageParticipantsQuerySchema.safeParse({ limit: "21" }).success).toBe(false);
  });
});

describe("reportConversationSchema", () => {
  test("a reason is mandatory and substantial — it is the record of the privacy exception", () => {
    // ADR-0004: reporting is what grants an admin the right to read a thread.
    expect(reportConversationSchema.safeParse({ reason: "spam" }).success).toBe(false);
    expect(reportConversationSchema.safeParse({}).success).toBe(false);
    expect(
      reportConversationSchema.parse({ reason: "Repeated abusive messages." }).reason
    ).toBe("Repeated abusive messages.");
  });
});

describe("websocketClientEventSchema", () => {
  test("accepts only the three events the client may send", () => {
    for (const type of ["typing:start", "typing:stop", "message:read"] as const) {
      expect(websocketClientEventSchema.safeParse({ conversationId: UUID, type }).success).toBe(
        true
      );
    }
  });

  test("rejects an event the server owns", () => {
    expect(
      websocketClientEventSchema.safeParse({ conversationId: UUID, type: "message:new" }).success
    ).toBe(false);
  });

  test("every event names its conversation", () => {
    expect(websocketClientEventSchema.safeParse({ type: "typing:start" }).success).toBe(false);
  });
});
