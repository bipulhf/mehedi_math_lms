import { FcmPushService } from "@/services/fcm-push-service";
import type { NotificationRepository } from "@/repositories/notification-repository";

function stringifyData(data: Record<string, string | number | boolean | null> | null): Record<string, string> {
  if (!data) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null) {
      result[key] = "";
    } else if (typeof value === "boolean" || typeof value === "number") {
      result[key] = String(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export async function processNotificationFcmJob(
  notificationRepository: NotificationRepository,
  fcmPushService: FcmPushService,
  notificationIds: readonly string[]
): Promise<void> {
  if (!fcmPushService.isReady || notificationIds.length === 0) {
    return;
  }

  const records = await notificationRepository.listByIds(notificationIds);

  for (const record of records) {
    const tokens = await notificationRepository.listFcmTokensByUserId(record.userId);

    if (tokens.length === 0) {
      continue;
    }

    await fcmPushService.sendToTokens({
      body: record.body,
      data: {
        ...stringifyData(record.data),
        notificationId: record.id,
        type: record.type
      },
      title: record.title,
      tokens
    });
  }
}
