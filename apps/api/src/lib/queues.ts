import { Queue } from "bullmq";

import { redis } from "@/lib/redis";
import type { QueueName } from "@/types/app-bindings";

export const queueNames = ["notification", "sms", "file-processing"] as const;

export type JobQueueMap = Record<QueueName, Queue>;

export const queues: JobQueueMap = {
  notification: new Queue("notification", { connection: redis }),
  sms: new Queue("sms", { connection: redis }),
  "file-processing": new Queue("file-processing", { connection: redis })
};
