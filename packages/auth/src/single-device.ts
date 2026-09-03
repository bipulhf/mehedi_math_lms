import { APIError } from "better-auth/api";
import { and, db, deviceConflictLogs, eq, gt, sessions, userDevices, users } from "@genex/db";
import {
  deviceIdHeader,
  devicePlatformHeader,
  deviceIdSchema,
  devicePlatformSchema,
  deviceLimitErrorCode,
  maxConcurrentDevices,
  resolveDeviceLimit,
  type DevicePlatform
} from "@genex/shared";

/**
 * One account, two devices at a time. ADR-0019.
 *
 * The limit is enforced where a session is born rather than where a request is
 * checked: a sign-in that would be the third live device is refused outright,
 * and the refusal is written down for an administrator to look at. Everything
 * already signed in stays signed in — kicking the earlier device out would
 * hand the account to whoever logged in last, which is the opposite of what
 * this is for.
 *
 * Only students are counted. A teacher marking scripts on a desktop and
 * answering a message on a phone is not the problem this solves, and an
 * administrator locked out of the dashboard by their own handset is a worse
 * outcome than any sharing it would prevent.
 */

interface DeviceContext {
  deviceId: string | null;
  ipAddress: string | null;
  platform: DevicePlatform;
  userAgent: string | null;
}

/** The shape of the row Better Auth is about to write, as much of it as this needs. */
interface SessionPayload {
  /** Set by the admin plugin when a staff member is impersonating this user. */
  impersonatedBy?: string | null | undefined;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
  userId: string;
}

interface HookContext {
  headers?: Headers | undefined;
  request?: { headers?: Headers } | undefined;
}

function readHeader(context: HookContext | null | undefined, name: string): string | null {
  const headers = context?.headers ?? context?.request?.headers;

  return headers?.get(name) ?? null;
}

/**
 * What the request says it is. Both fields are client-controlled, so both are
 * validated rather than trusted: a device id is only useful if it is the same
 * string next time, and a 4KB one would be a way to fill the column.
 */
export function readDeviceContext(
  session: SessionPayload,
  context: HookContext | null | undefined
): DeviceContext {
  const rawDeviceId = readHeader(context, deviceIdHeader);
  const parsedDeviceId = deviceIdSchema.safeParse(rawDeviceId ?? "");
  const parsedPlatform = devicePlatformSchema.safeParse(
    readHeader(context, devicePlatformHeader) ?? ""
  );

  return {
    deviceId: parsedDeviceId.success ? parsedDeviceId.data : null,
    ipAddress: session.ipAddress ?? readHeader(context, "x-forwarded-for"),
    platform: parsedPlatform.success ? parsedPlatform.data : "unknown",
    userAgent: session.userAgent ?? readHeader(context, "user-agent")
  };
}

async function loadDevicePolicy(
  userId: string
): Promise<{ isStudent: boolean; multiDeviceAllowed: boolean } | null> {
  const [user] = await db
    .select({ multiDeviceAllowed: users.multiDeviceAllowed, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  return { isStudent: user.role === "STUDENT", multiDeviceAllowed: user.multiDeviceAllowed };
}

/**
 * Refuses the sign-in and stamps the session with the device that opened it.
 *
 * Returns the fields Better Auth should merge into the row, or `undefined`
 * when there is nothing to add — the hook contract treats a returned object as
 * a patch on the payload, so returning nothing leaves it alone.
 */
export async function enforceDeviceLimit(
  session: SessionPayload,
  context: HookContext | null | undefined
): Promise<{ data: { deviceId: string } } | undefined> {
  const device = readDeviceContext(session, context);
  const policy = await loadDevicePolicy(session.userId);

  // Three ways past the limit, and each is deliberate. `policy` is null for a
  // user row this transaction has not committed yet -- sign-up writes the user
  // and its first session together, so there is nothing to count. An
  // impersonation session belongs to the staff member behind it, and refusing
  // it would mean support cannot look at the account of the very student whose
  // devices are full. And a lifted limit is the administrator's own decision.
  const isImpersonation = Boolean(session.impersonatedBy);

  if (policy !== null && policy.isStudent && !policy.multiDeviceAllowed && !isImpersonation) {
    const activeSessions = await db
      .select({ deviceId: sessions.deviceId, sessionId: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, session.userId), gt(sessions.expiresAt, new Date())));

    const decision = resolveDeviceLimit({
      activeSessions,
      deviceId: device.deviceId,
      limit: maxConcurrentDevices
    });

    if (!decision.allowed) {
      await recordConflict(session.userId, device, decision.activeDeviceCount, decision.limit);

      throw new APIError("FORBIDDEN", {
        code: deviceLimitErrorCode,
        message: `This account is already signed in on ${String(decision.limit)} devices. Sign out on one of them, or ask the academy to review your account.`
      });
    }
  }

  return device.deviceId === null ? undefined : { data: { deviceId: device.deviceId } };
}

/**
 * The device list an administrator reads a conflict against. Written after the
 * session exists, and never allowed to fail the sign-in it describes -- the
 * same rule the audit trail follows.
 */
export async function recordDevice(
  session: SessionPayload,
  context: HookContext | null | undefined
): Promise<void> {
  const device = readDeviceContext(session, context);

  if (device.deviceId === null) {
    return;
  }

  try {
    await db
      .insert(userDevices)
      .values({
        deviceId: device.deviceId,
        lastIpAddress: device.ipAddress,
        platform: device.platform,
        userAgent: device.userAgent,
        userId: session.userId
      })
      .onConflictDoUpdate({
        set: {
          lastIpAddress: device.ipAddress,
          lastSeenAt: new Date(),
          platform: device.platform,
          userAgent: device.userAgent
        },
        target: [userDevices.userId, userDevices.deviceId]
      });
  } catch (writeError) {
    console.error("Failed to record device", writeError);
  }
}

async function recordConflict(
  userId: string,
  device: DeviceContext,
  activeDeviceCount: number,
  deviceLimit: number
): Promise<void> {
  try {
    await db.insert(deviceConflictLogs).values({
      activeDeviceCount,
      attemptedDeviceId: device.deviceId,
      attemptedIpAddress: device.ipAddress,
      attemptedPlatform: device.platform,
      attemptedUserAgent: device.userAgent,
      deviceLimit,
      userId
    });
  } catch (writeError) {
    // The refusal still stands. A conflict nobody can review is worse than a
    // conflict logged twice, but neither is worth letting a third device in.
    console.error("Failed to record device conflict", writeError);
  }
}
