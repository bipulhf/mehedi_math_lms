import { Worker } from "bullmq";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { NotificationRepository } from "@/repositories/notification-repository";
import { FcmPushService } from "@/services/fcm-push-service";
import { processNotificationFcmJob } from "@/services/notification-fcm-processor";

const notificationRepository = new NotificationRepository();
const fcmPushService = new FcmPushService();

interface NotificationJobPayload {
  notificationIds: readonly string[];
}

const worker = new Worker<NotificationJobPayload>(
  "notification",
  async (job) => {
    await processNotificationFcmJob(notificationRepository, fcmPushService, job.data.notificationIds);
  },
  {
    connection: redis,
    concurrency: 4
  }
);

worker.on("failed", (job, error) => {
  logger.error({ error, jobId: job?.id }, "Notification worker job failed");
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Notification worker job completed");
});

logger.info({ host: env.API_HOST }, "Notification FCM worker started");
