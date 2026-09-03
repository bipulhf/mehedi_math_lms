import { maxConcurrentDevices } from "./constants/devices";

export interface ActiveDeviceSession {
  /**
   * The client's own persistent id. Null for a session opened by something
   * that sent no header — an old build, a script, a curl.
   */
  deviceId: string | null;
  sessionId: string;
}

export interface DeviceLimitInput {
  /** Every session of this user that has not expired yet. */
  activeSessions: readonly ActiveDeviceSession[];
  /** The id the sign-in being decided arrived with, if it sent one. */
  deviceId: string | null;
  /** `maxConcurrentDevices`, unless the account is allowed more. */
  limit?: number;
}

export interface DeviceLimitDecision {
  /** How many distinct devices are already signed in. */
  activeDeviceCount: number;
  allowed: boolean;
  limit: number;
  /**
   * Why it was allowed, which is worth keeping apart: a device that is already
   * signed in does not consume a second slot, and that is not the same
   * decision as "there was room".
   */
  reason: "known-device" | "under-limit" | "over-limit" | "unlimited";
}

/**
 * Whether a sign-in may open a session, counted in **devices** rather than in
 * sessions. One device signing in twice — a reinstall, a second browser tab
 * that lost its cookie — is one device, and it is the same person either way.
 *
 * A session with no device id counts as a device of its own. That is the
 * conservative reading: a client that will not say who it is cannot be assumed
 * to be a client already counted, and an old build that never sends the header
 * still gets the two slots everybody else has.
 *
 * Pure on purpose. The database work around it is untestable without a
 * database; this is the part with the branches in it.
 */
export function resolveDeviceLimit(input: DeviceLimitInput): DeviceLimitDecision {
  const limit = input.limit ?? maxConcurrentDevices;
  const deviceKeys = new Set(
    input.activeSessions.map((session) => session.deviceId ?? `session:${session.sessionId}`)
  );
  const activeDeviceCount = deviceKeys.size;

  if (limit <= 0) {
    return { activeDeviceCount, allowed: true, limit, reason: "unlimited" };
  }

  if (input.deviceId !== null && deviceKeys.has(input.deviceId)) {
    return { activeDeviceCount, allowed: true, limit, reason: "known-device" };
  }

  if (activeDeviceCount < limit) {
    return { activeDeviceCount, allowed: true, limit, reason: "under-limit" };
  }

  return { activeDeviceCount, allowed: false, limit, reason: "over-limit" };
}
