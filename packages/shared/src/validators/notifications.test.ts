import { describe, expect, test } from "bun:test";

import {
  adminSendNotificationSchema,
  deviceTypeSchema,
  notificationTypeSchema,
  notificationsListQuerySchema,
  registerFcmDeviceSchema
} from "./notifications";
import { adminSendSmsSchema, adminSmsHistoryQuerySchema } from "./sms";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("notificationTypeSchema", () => {
  test("matches the database enum", () => {
    expect(notificationTypeSchema.options).toEqual([
      "SYSTEM",
      "COURSE",
      "NOTICE",
      "MESSAGE",
      "PAYMENT",
      "BUG_REPORT"
    ]);
  });
});

describe("registerFcmDeviceSchema", () => {
  test("a device registers with a type and a token", () => {
    expect(deviceTypeSchema.options).toEqual(["WEB", "ANDROID", "IOS"]);
    expect(
      registerFcmDeviceSchema.parse({ deviceType: "ANDROID", token: "fcm-token" }).token
    ).toBe("fcm-token");
  });

  test("rejects an empty token and an unknown platform", () => {
    expect(registerFcmDeviceSchema.safeParse({ deviceType: "ANDROID", token: "" }).success).toBe(
      false
    );
    expect(
      registerFcmDeviceSchema.safeParse({ deviceType: "DESKTOP", token: "fcm" }).success
    ).toBe(false);
  });
});

describe("adminSendNotificationSchema", () => {
  function payload(target: unknown): Record<string, unknown> {
    return { body: "Class moved to Sunday.", target, title: "Schedule change", type: "COURSE" };
  }

  test("accepts each of the three ways to pick an audience", () => {
    expect(adminSendNotificationSchema.safeParse(payload({ kind: "role", role: "STUDENT" })).success).toBe(
      true
    );
    expect(
      adminSendNotificationSchema.safeParse(payload({ kind: "users", userIds: [UUID] })).success
    ).toBe(true);
    expect(
      adminSendNotificationSchema.safeParse(payload({ courseId: UUID, kind: "course" })).success
    ).toBe(true);
  });

  test("a broadcast must name someone — an empty user list is not an audience", () => {
    expect(
      adminSendNotificationSchema.safeParse(payload({ kind: "users", userIds: [] })).success
    ).toBe(false);
  });

  test("caps a direct send at 500 recipients", () => {
    const userIds = Array.from({ length: 501 }, () => UUID);

    expect(adminSendNotificationSchema.safeParse(payload({ kind: "users", userIds })).success).toBe(
      false
    );
  });

  test("rejects an audience kind that does not exist", () => {
    expect(adminSendNotificationSchema.safeParse(payload({ kind: "everyone" })).success).toBe(false);
  });

  test("title and body are required", () => {
    expect(
      adminSendNotificationSchema.safeParse({
        body: "",
        target: { kind: "role", role: "STUDENT" },
        title: "Schedule change",
        type: "COURSE"
      }).success
    ).toBe(false);
  });
});

describe("adminSendSmsSchema", () => {
  test("accepts the three targets and caps the message at 1000 characters", () => {
    expect(
      adminSendSmsSchema.safeParse({ message: "Exam tomorrow.", target: { kind: "all_students" } })
        .success
    ).toBe(true);
    expect(
      adminSendSmsSchema.safeParse({
        message: "Exam tomorrow.",
        target: { courseId: UUID, kind: "course" }
      }).success
    ).toBe(true);
    expect(
      adminSendSmsSchema.safeParse({ message: "a".repeat(1001), target: { kind: "all_students" } })
        .success
    ).toBe(false);
  });

  test("refuses an empty message — an SMS still costs money to send", () => {
    expect(
      adminSendSmsSchema.safeParse({ message: "   ", target: { kind: "all_students" } }).success
    ).toBe(false);
  });
});

describe("list queries", () => {
  test("both notification and SMS history default to twenty on page one", () => {
    expect(notificationsListQuerySchema.parse({})).toEqual({ limit: 20, page: 1 });
    expect(adminSmsHistoryQuerySchema.parse({})).toEqual({ limit: 20, page: 1 });
  });
});
