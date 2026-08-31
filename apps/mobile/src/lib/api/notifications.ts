import { apiGet, apiPost, apiPut, buildQueryString } from "@/src/lib/api-client";

/** The notification list, its unread count, and this device's push token. */

export interface NotificationRecord {
  body: string;
  createdAt: string;
  data: Record<string, string | number | boolean | null> | null;
  id: string;
  readAt: string | null;
  title: string;
  type: "NOTICE" | "PAYMENT" | "COURSE" | "MESSAGE" | "BUG_REPORT" | "SYSTEM";
}

export async function listNotifications(): Promise<{ items: readonly NotificationRecord[] }> {
  return apiGet<{ items: readonly NotificationRecord[] }>(
    `notifications${buildQueryString({ limit: 30, page: 1 })}`
  );
}

export async function getNotificationUnreadCount(): Promise<number> {
  const data = await apiGet<{ count: number }>("notifications/unread-count");

  return data.count;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiPut(`notifications/${notificationId}/read`, {});
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiPut<Record<string, never>, { updated: number }>("notifications/read-all", {});
}

export async function registerPushToken(input: {
  deviceType: "ANDROID" | "IOS" | "WEB";
  token: string;
}): Promise<void> {
  await apiPost("notifications/register-device", input);
}
