import { apiGet, apiPost, apiPut, type PaginatedEnvelope } from "@/lib/api/client";

export interface NotificationRecord {
  body: string;
  createdAt: string;
  data: Record<string, string | number | boolean | null> | null;
  id: string;
  readAt: string | null;
  title: string;
  type: "SYSTEM" | "COURSE" | "NOTICE" | "MESSAGE" | "PAYMENT" | "BUG_REPORT";
}

export interface NotificationsPage {
  items: readonly NotificationRecord[];
  limit: number;
  page: number;
  pages: number;
  total: number;
}

function buildQueryString(query: Record<string, number | string | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

export async function getNotificationUnreadCount(): Promise<number> {
  const response = await apiGet<{ count: number }>("notifications/unread-count");

  return response.data.count;
}

export async function listNotifications(
  query: Partial<{ limit: number; page: number }> = {}
): Promise<NotificationsPage> {
  const response = (await apiGet<readonly NotificationRecord[]>(
    `notifications${buildQueryString({
      limit: query.limit,
      page: query.page
    })}`
  )) as PaginatedEnvelope<NotificationRecord>;

  return {
    items: response.data,
    limit: response.pagination.limit,
    page: response.pagination.page,
    pages: response.pagination.pages,
    total: response.pagination.total
  };
}

export async function markNotificationRead(id: string): Promise<NotificationRecord> {
  const response = await apiPut<Record<string, never>, NotificationRecord>(`notifications/${id}/read`, {});

  return response.data;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const response = await apiPut<Record<string, never>, { updated: number }>("notifications/read-all", {});

  return response.data;
}

export async function registerFcmDevice(input: {
  deviceType: "WEB" | "ANDROID" | "IOS";
  token: string;
}): Promise<void> {
  await apiPost("notifications/register-device", input);
}

export const NOTIFICATIONS_EVENT = "mma:notifications-updated";

export function emitNotificationsUpdated(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));
}
