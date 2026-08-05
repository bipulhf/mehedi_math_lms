import { describe, expect, test } from "bun:test";

import { env } from "@/lib/env";
import { enqueue, queues, requireQueue } from "@/lib/queues";
import { RedisUnavailableError } from "@/lib/redis";

/**
 * The seam that decides whether a job is durable or runs here. It is the one
 * place the on/off choice is made, so it is the one place worth pinning.
 *
 * These assert whichever mode the suite is running in — the point is that both
 * are coherent, not that one of them is the truth.
 */

describe("queues", () => {
  test("exist when Redis is enabled and do not when it is off", () => {
    if (env.isRedisEnabled) {
      expect(queues).not.toBeNull();
      expect(Object.keys(queues ?? {})).toHaveLength(4);
    } else {
      expect(queues).toBeNull();
    }
  });
});

describe("requireQueue", () => {
  test("names the capability rather than failing anonymously", () => {
    if (env.isRedisEnabled) {
      expect(requireQueue("sms")).toBeDefined();

      return;
    }

    expect(() => requireQueue("sms")).toThrow(RedisUnavailableError);
    // A 503 rather than a 500: this is a capability that is switched off, not a
    // fault, and the message says which switch.
    expect(() => requireQueue("sms")).toThrow(/REDIS_ENABLED/);
  });
});

describe("enqueue", () => {
  test.if(!env.isRedisEnabled)("runs the job in this process when there is no queue", async () => {
    let ran = false;

    await enqueue("sms", "sms-deliver", { batchId: "batch-1" }, {}, async () => {
      ran = true;
    });

    // Deliberately after the caller returns, so a broadcast to four hundred
    // students does not sit inside the admin's request.
    expect(ran).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(ran).toBe(true);
  });

  test.if(!env.isRedisEnabled)("a failing job never reaches the caller", async () => {
    // The request has already been answered by the time this runs, so an
    // unhandled rejection here would take the process down.
    await enqueue("notification", "fcm-deliver", { notificationIds: [] }, {}, async () => {
      throw new Error("push provider is having a day");
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(true).toBe(true);
  });
});
