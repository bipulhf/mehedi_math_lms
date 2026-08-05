import { describe, expect, test } from "bun:test";
import type { WSContext } from "hono/ws";

import { MessageRealtimeService } from "@/services/message-realtime-service";

/**
 * Local-only realtime, the mode a deployment with no Redis runs in.
 *
 * Presence is the part that matters: it is awaited on five read paths in
 * `message-service.ts` — the conversation list, the participant list, opening a
 * thread, sending — so without a working local implementation those hang rather
 * than degrade. Delivery is the easy half, because `deliver` only ever wrote to
 * this process's sockets.
 */

function fakeSocket(sent: string[]): WSContext<undefined> {
  return {
    send: (data: string) => {
      sent.push(data);
    }
  } as unknown as WSContext<undefined>;
}

describe("MessageRealtimeService without Redis", () => {
  test("a registered user is online, and stops being when the socket goes", async () => {
    const service = new MessageRealtimeService(null);
    const { connectionId } = await service.registerConnection("student-1", fakeSocket([]));

    expect(await service.getOnlineUserIds(["student-1", "student-2"])).toEqual(
      new Set(["student-1"])
    );

    await service.unregisterConnection("student-1", connectionId);

    expect(await service.getOnlineUserIds(["student-1"])).toEqual(new Set());
  });

  test("two tabs count as one person, and the person is online until both close", async () => {
    const service = new MessageRealtimeService(null);
    const first = await service.registerConnection("teacher-1", fakeSocket([]));
    const second = await service.registerConnection("teacher-1", fakeSocket([]));

    await service.unregisterConnection("teacher-1", first.connectionId);

    expect(await service.getOnlineUserIds(["teacher-1"])).toEqual(new Set(["teacher-1"]));

    await service.unregisterConnection("teacher-1", second.connectionId);

    expect(await service.getOnlineUserIds(["teacher-1"])).toEqual(new Set());
  });

  test("publishing delivers to the addressed sockets in this process", async () => {
    const service = new MessageRealtimeService(null);
    const forStudent: string[] = [];
    const forOther: string[] = [];

    await service.registerConnection("student-1", fakeSocket(forStudent));
    await service.registerConnection("student-2", fakeSocket(forOther));

    await service.publish({
      conversationId: "conversation-1",
      data: { messageId: "message-1" },
      type: "message:new",
      userIds: ["student-1"]
    });

    expect(forStudent.some((payload) => payload.includes("message:new"))).toBe(true);
    expect(forOther.some((payload) => payload.includes("message:new"))).toBe(false);
  });

  test("shutdown releases every connection, so nobody is left online", async () => {
    // With Redis this is what stops a restart leaving the presence hash full of
    // people who are not there. In local mode the map dies with the process
    // anyway, but the same call must still clear it.
    const service = new MessageRealtimeService(null);

    await service.registerConnection("student-1", fakeSocket([]));
    await service.registerConnection("student-2", fakeSocket([]));
    await service.releaseAllConnections();

    expect(await service.getOnlineUserIds(["student-1", "student-2"])).toEqual(new Set());
  });
});
