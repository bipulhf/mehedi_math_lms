import { describe, expect, test } from "bun:test";

import { resolveDeviceLimit } from "./device-limit";

const session = (sessionId: string, deviceId: string | null) => ({ deviceId, sessionId });

describe("resolveDeviceLimit", () => {
  test("lets the first device in", () => {
    const decision = resolveDeviceLimit({ activeSessions: [], deviceId: "phone" });

    expect(decision.allowed).toBe(true);
    expect(decision.activeDeviceCount).toBe(0);
    expect(decision.reason).toBe("under-limit");
  });

  test("lets a second device in", () => {
    const decision = resolveDeviceLimit({
      activeSessions: [session("s1", "phone")],
      deviceId: "laptop"
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("under-limit");
  });

  test("refuses a third device", () => {
    const decision = resolveDeviceLimit({
      activeSessions: [session("s1", "phone"), session("s2", "laptop")],
      deviceId: "tablet"
    });

    expect(decision.allowed).toBe(false);
    expect(decision.activeDeviceCount).toBe(2);
    expect(decision.reason).toBe("over-limit");
  });

  // The case that would otherwise lock somebody out of their own phone: a
  // second sign-in from a device already counted is the same device.
  test("lets a device that is already signed in back in", () => {
    const decision = resolveDeviceLimit({
      activeSessions: [session("s1", "phone"), session("s2", "laptop")],
      deviceId: "phone"
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("known-device");
  });

  test("counts two sessions on one device once", () => {
    const decision = resolveDeviceLimit({
      activeSessions: [session("s1", "phone"), session("s2", "phone")],
      deviceId: "laptop"
    });

    expect(decision.activeDeviceCount).toBe(1);
    expect(decision.allowed).toBe(true);
  });

  test("counts a session with no device id as its own device", () => {
    const decision = resolveDeviceLimit({
      activeSessions: [session("s1", null), session("s2", null)],
      deviceId: "phone"
    });

    expect(decision.activeDeviceCount).toBe(2);
    expect(decision.allowed).toBe(false);
  });

  test("never matches a headerless sign-in against a headerless session", () => {
    const decision = resolveDeviceLimit({
      activeSessions: [session("s1", null)],
      deviceId: null
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("under-limit");
  });

  test("a limit of zero is no limit at all", () => {
    const decision = resolveDeviceLimit({
      activeSessions: [session("s1", "a"), session("s2", "b"), session("s3", "c")],
      deviceId: "d",
      limit: 0
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("unlimited");
  });
});
