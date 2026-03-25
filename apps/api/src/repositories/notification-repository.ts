import {
  and,
  count,
  db,
  desc,
  eq,
  fcmTokens,
  inArray,
  isNull,
  notifications,
  users
} from "@mma/db";
import type { UserRole } from "@mma/shared";

export type NotificationType = "SYSTEM" | "COURSE" | "NOTICE" | "MESSAGE" | "PAYMENT" | "BUG_REPORT";

export type DeviceType = "WEB" | "ANDROID" | "IOS";

export interface NotificationRecord {
  body: string;
  createdAt: Date;
  data: Record<string, string | number | boolean | null> | null;
  id: string;
  readAt: Date | null;
  title: string;
  type: NotificationType;
  userId: string;
}

export class NotificationRepository {
  public async insertForUser(input: {
    body: string;
    data?: Record<string, string | number | boolean | null> | undefined;
    title: string;
    type: NotificationType;
    userId: string;
  }): Promise<NotificationRecord> {
    const [row] = await db
      .insert(notifications)
      .values({
        body: input.body,
        data: input.data ?? null,
        title: input.title,
        type: input.type,
        userId: input.userId
      })
      .returning({
        body: notifications.body,
        createdAt: notifications.createdAt,
        data: notifications.data,
        id: notifications.id,
        readAt: notifications.readAt,
        title: notifications.title,
        type: notifications.type,
        userId: notifications.userId
      });

    if (!row) {
      throw new Error("Failed to create notification");
    }

    return {
      ...row,
      data: row.data ?? null,
      type: row.type as NotificationType
    };
  }

  public async insertForUsers(
    userIds: readonly string[],
    input: {
      body: string;
      data?: Record<string, string | number | boolean | null> | undefined;
      title: string;
      type: NotificationType;
    }
  ): Promise<readonly NotificationRecord[]> {
    if (userIds.length === 0) {
      return [];
    }

    const values = userIds.map((userId) => ({
      body: input.body,
      data: input.data ?? null,
      title: input.title,
      type: input.type,
      userId
    }));

    const rows = await db.insert(notifications).values(values).returning({
      body: notifications.body,
      createdAt: notifications.createdAt,
      data: notifications.data,
      id: notifications.id,
      readAt: notifications.readAt,
      title: notifications.title,
      type: notifications.type,
      userId: notifications.userId
    });

    return rows.map((row) => ({
      ...row,
      data: row.data ?? null,
      type: row.type as NotificationType
    }));
  }

  public async findByIdForUser(id: string, userId: string): Promise<NotificationRecord | null> {
    const [row] = await db
      .select({
        body: notifications.body,
        createdAt: notifications.createdAt,
        data: notifications.data,
        id: notifications.id,
        readAt: notifications.readAt,
        title: notifications.title,
        type: notifications.type,
        userId: notifications.userId
      })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      ...row,
      data: row.data ?? null,
      type: row.type as NotificationType
    };
  }

  public async listByIds(ids: readonly string[]): Promise<readonly NotificationRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        body: notifications.body,
        createdAt: notifications.createdAt,
        data: notifications.data,
        id: notifications.id,
        readAt: notifications.readAt,
        title: notifications.title,
        type: notifications.type,
        userId: notifications.userId
      })
      .from(notifications)
      .where(inArray(notifications.id, [...ids]));

    return rows.map((row) => ({
      ...row,
      data: row.data ?? null,
      type: row.type as NotificationType
    }));
  }

  public async listForUser(
    userId: string,
    input: { limit: number; page: number }
  ): Promise<{ items: readonly NotificationRecord[]; total: number }> {
    const offset = (input.page - 1) * input.limit;

    const [items, totals] = await Promise.all([
      db
        .select({
          body: notifications.body,
          createdAt: notifications.createdAt,
          data: notifications.data,
          id: notifications.id,
          readAt: notifications.readAt,
          title: notifications.title,
          type: notifications.type,
          userId: notifications.userId
        })
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(notifications)
        .where(eq(notifications.userId, userId))
    ]);

    return {
      items: items.map((row) => ({
        ...row,
        data: row.data ?? null,
        type: row.type as NotificationType
      })),
      total: totals[0]?.value ?? 0
    };
  }

  public async countUnreadForUser(userId: string): Promise<number> {
    const rows = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return rows[0]?.value ?? 0;
  }

  public async markRead(id: string, userId: string): Promise<NotificationRecord | null> {
    const [row] = await db
      .update(notifications)
      .set({
        readAt: new Date()
      })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId), isNull(notifications.readAt)))
      .returning({
        body: notifications.body,
        createdAt: notifications.createdAt,
        data: notifications.data,
        id: notifications.id,
        readAt: notifications.readAt,
        title: notifications.title,
        type: notifications.type,
        userId: notifications.userId
      });

    if (!row) {
      return this.findByIdForUser(id, userId);
    }

    return {
      ...row,
      data: row.data ?? null,
      type: row.type as NotificationType
    };
  }

  public async markAllRead(userId: string): Promise<number> {
    const updated = await db
      .update(notifications)
      .set({
        readAt: new Date()
      })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .returning({ id: notifications.id });

    return updated.length;
  }

  public async listActiveUserIdsByRole(role: UserRole): Promise<readonly string[]> {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, role), eq(users.isActive, true)));

    return rows.map((row) => row.id);
  }

  public async upsertFcmToken(input: {
    deviceType: DeviceType;
    token: string;
    userId: string;
  }): Promise<void> {
    const [existing] = await db
      .select({ id: fcmTokens.id })
      .from(fcmTokens)
      .where(eq(fcmTokens.token, input.token))
      .limit(1);

    if (existing) {
      await db
        .update(fcmTokens)
        .set({
          deviceType: input.deviceType,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
          userId: input.userId
        })
        .where(eq(fcmTokens.id, existing.id));

      return;
    }

    await db.insert(fcmTokens).values({
      deviceType: input.deviceType,
      lastUsedAt: new Date(),
      token: input.token,
      userId: input.userId
    });
  }

  public async listFcmTokensByUserId(userId: string): Promise<readonly string[]> {
    const rows = await db
      .select({ token: fcmTokens.token })
      .from(fcmTokens)
      .where(eq(fcmTokens.userId, userId));

    return rows.map((row) => row.token);
  }
}
