import { Queue } from "bullmq";

import { createQueueConnection } from "@/lib/redis";
import type { QueueName } from "@/types/app-bindings";

export const queueNames = ["notification", "sms", "file-processing", "audit-log-cleanup"] as const;

export type JobQueueMap = Record<QueueName, Queue>;

/**
 * Each queue gets its own connection rather than sharing the request client:
 * the request client now gives up on a command in a second, which is right for
 * a cache read and wrong for a queue.
 */
export const queues: JobQueueMap = {
  notification: new Queue("notification", { connection: createQueueConnection() }),
  sms: new Queue("sms", { connection: createQueueConnection() }),
  "file-processing": new Queue("file-processing", { connection: createQueueConnection() }),
  "audit-log-cleanup": new Queue("audit-log-cleanup", { connection: createQueueConnection() })
};
