import type { DeviceConflictStatus } from "@genex/shared";
import type { SQL } from "@genex/db";
import {
  and,
  count,
  db,
  desc,
  deviceConflictLogs,
  eq,
  gt,
  ilike,
  isNull,
  or,
  sessions,
  userDevices,
  users
} from "@genex/db";

export interface DeviceConflictQuery {
  limit: number;
  page: number;
  search?: string | undefined;
  status?: DeviceConflictStatus | undefined;
}

export interface DeviceConflictRecord {
  activeDeviceCount: number;
  attemptedDeviceId: string | null;
  attemptedIpAddress: string | null;
  attemptedPlatform: string;
  attemptedUserAgent: string | null;
  createdAt: Date;
  deviceLimit: number;
  id: string;
  note: string | null;
  reviewedAt: Date | null;
  status: DeviceConflictStatus;
  user: {
    email: string;
    id: string;
    isActive: boolean;
    multiDeviceAllowed: boolean;
    name: string;
  };
}

export interface UserDeviceRecord {
  deviceId: string;
  firstSeenAt: Date;
  hasLiveSession: boolean;
  id: string;
  lastIpAddress: string | null;
  lastSeenAt: Date;
  platform: string;
  userAgent: string | null;
}

function buildConflictFilters(query: DeviceConflictQuery): SQL<unknown> | undefined {
  const filters: Array<SQL<unknown>> = [];

  if (query.status) {
    filters.push(eq(deviceConflictLogs.status, query.status));
  }

  if (query.search && query.search.trim().length > 0) {
    const term = `%${query.search.trim()}%`;
    const searchFilter = or(ilike(users.name, term), ilike(users.email, term));

    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  if (filters.length === 0) {
    return undefined;
  }

  return filters.length === 1 ? filters[0] : and(...filters);
}

export class DeviceRepository {
  public async listConflicts(
    query: DeviceConflictQuery
  ): Promise<{ items: readonly DeviceConflictRecord[]; total: number }> {
    const filters = buildConflictFilters(query);
    const rows = await db
      .select({
        activeDeviceCount: deviceConflictLogs.activeDeviceCount,
        attemptedDeviceId: deviceConflictLogs.attemptedDeviceId,
        attemptedIpAddress: deviceConflictLogs.attemptedIpAddress,
        attemptedPlatform: deviceConflictLogs.attemptedPlatform,
        attemptedUserAgent: deviceConflictLogs.attemptedUserAgent,
        createdAt: deviceConflictLogs.createdAt,
        deviceLimit: deviceConflictLogs.deviceLimit,
        id: deviceConflictLogs.id,
        note: deviceConflictLogs.note,
        reviewedAt: deviceConflictLogs.reviewedAt,
        status: deviceConflictLogs.status,
        userEmail: users.email,
        userId: users.id,
        userIsActive: users.isActive,
        userMultiDeviceAllowed: users.multiDeviceAllowed,
        userName: users.name
      })
      .from(deviceConflictLogs)
      .innerJoin(users, eq(users.id, deviceConflictLogs.userId))
      .where(filters)
      .orderBy(desc(deviceConflictLogs.createdAt))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    const [totalRow] = await db
      .select({ value: count() })
      .from(deviceConflictLogs)
      .innerJoin(users, eq(users.id, deviceConflictLogs.userId))
      .where(filters);

    return {
      items: rows.map((row) => ({
        activeDeviceCount: row.activeDeviceCount,
        attemptedDeviceId: row.attemptedDeviceId,
        attemptedIpAddress: row.attemptedIpAddress,
        attemptedPlatform: row.attemptedPlatform,
        attemptedUserAgent: row.attemptedUserAgent,
        createdAt: row.createdAt,
        deviceLimit: row.deviceLimit,
        id: row.id,
        note: row.note,
        reviewedAt: row.reviewedAt,
        status: row.status,
        user: {
          email: row.userEmail,
          id: row.userId,
          isActive: row.userIsActive,
          multiDeviceAllowed: row.userMultiDeviceAllowed,
          name: row.userName
        }
      })),
      total: totalRow?.value ?? 0
    };
  }

  public async countOpenConflicts(): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(deviceConflictLogs)
      .where(eq(deviceConflictLogs.status, "OPEN"));

    return row?.value ?? 0;
  }

  public async findConflictUserId(conflictId: string): Promise<string | null> {
    const [row] = await db
      .select({ userId: deviceConflictLogs.userId })
      .from(deviceConflictLogs)
      .where(eq(deviceConflictLogs.id, conflictId))
      .limit(1);

    return row?.userId ?? null;
  }

  public async resolveConflict(input: {
    conflictId: string;
    note?: string | undefined;
    reviewerId: string;
    status: DeviceConflictStatus;
  }): Promise<void> {
    await db
      .update(deviceConflictLogs)
      .set({
        note: input.note ?? null,
        // Reopening clears the reviewer with it, so the row does not claim
        // somebody has looked at something that is back in the queue.
        reviewedAt: input.status === "OPEN" ? null : new Date(),
        reviewedBy: input.status === "OPEN" ? null : input.reviewerId,
        status: input.status
      })
      .where(eq(deviceConflictLogs.id, input.conflictId));
  }

  /**
   * The devices an account has signed in from, newest first, each marked with
   * whether it is holding a live session right now. That flag is what tells a
   * reviewer the difference between "two people are using this" and "this
   * person has had three phones since March".
   */
  public async listUserDevices(userId: string): Promise<readonly UserDeviceRecord[]> {
    const rows = await db
      .select({
        deviceId: userDevices.deviceId,
        firstSeenAt: userDevices.firstSeenAt,
        id: userDevices.id,
        lastIpAddress: userDevices.lastIpAddress,
        lastSeenAt: userDevices.lastSeenAt,
        platform: userDevices.platform,
        userAgent: userDevices.userAgent
      })
      .from(userDevices)
      .where(eq(userDevices.userId, userId))
      .orderBy(desc(userDevices.lastSeenAt));

    const liveSessions = await db
      .select({ deviceId: sessions.deviceId })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())));

    const liveDeviceIds = new Set(
      liveSessions.map((session) => session.deviceId).filter((id): id is string => id !== null)
    );

    return rows.map((row) => ({ ...row, hasLiveSession: liveDeviceIds.has(row.deviceId) }));
  }

  /**
   * Stamps a session that was opened without a device header, and only if it
   * still has none. The mobile Google flow is why this exists: the session is
   * created inside an in-app browser that sends none of the app's headers, so
   * the app claims it afterwards over a request that does.
   */
  public async claimSession(input: {
    deviceId: string;
    ipAddress: string | null;
    platform: string;
    sessionId: string;
    userAgent: string | null;
    userId: string;
  }): Promise<void> {
    await db
      .update(sessions)
      .set({ deviceId: input.deviceId })
      .where(and(eq(sessions.id, input.sessionId), isNull(sessions.deviceId)));

    await db
      .insert(userDevices)
      .values({
        deviceId: input.deviceId,
        lastIpAddress: input.ipAddress,
        platform: input.platform,
        userAgent: input.userAgent,
        userId: input.userId
      })
      .onConflictDoUpdate({
        set: {
          lastIpAddress: input.ipAddress,
          lastSeenAt: new Date(),
          platform: input.platform,
          userAgent: input.userAgent
        },
        target: [userDevices.userId, userDevices.deviceId]
      });
  }

  public async setMultiDeviceAllowed(userId: string, allowed: boolean): Promise<void> {
    await db
      .update(users)
      .set({ multiDeviceAllowed: allowed, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
