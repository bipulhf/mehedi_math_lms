import { apiGet, apiGetPaginated, apiPost, apiPut, buildQueryString } from "@/src/lib/api-client";

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

/**
 * `apiGetPaginated`, not `apiGet`, because the endpoint answers with the
 * `{ status, data: [...], pagination }` envelope that `paginated()` writes on
 * the API side — `data` is the array itself, there is no `items` key on it.
 * This used to call `apiGet` and claim `{ items }`, so `data.items` was
 * `undefined` at runtime while type-checking cleanly, and the notifications
 * list died on `Cannot read property 'length' of undefined`. Shaped like
 * `listCourses` now, which is the convention for every paginated list here.
 */
export async function listNotifications(): Promise<{
  items: readonly NotificationRecord[];
  pages: number;
}> {
  const response = await apiGetPaginated<NotificationRecord>(
    `notifications${buildQueryString({ limit: 30, page: 1 })}`
  );

  return { items: response.data, pages: response.pagination.pages };
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
