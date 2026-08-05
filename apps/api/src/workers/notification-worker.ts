import { Worker } from "bullmq";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createQueueConnection } from "@/lib/redis";
import { NotificationRepository } from "@/repositories/notification-repository";
import { FcmPushService } from "@/services/fcm-push-service";
import { processNotificationFcmJob } from "@/services/notification-fcm-processor";

// A worker with no queue is a process pretending to work. Exit loudly instead,
// so `docker ps` and a restart loop show it rather than hiding it. ADR-0015.
if (!env.isRedisEnabled) {
  logger.error("REDIS_ENABLED is false; this worker has no queue to read and will not start");
  process.exit(1);
}

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
    connection: createQueueConnection(),
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
