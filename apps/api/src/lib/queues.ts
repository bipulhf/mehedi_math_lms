import { Queue } from "bullmq";
import type { JobsOptions } from "bullmq";

import { env } from "@/lib/env";
import { runInProcess } from "@/lib/job-runner";
import { logger } from "@/lib/logger";
import { RedisUnavailableError, createQueueConnection } from "@/lib/redis";
import type { QueueName } from "@/types/app-bindings";

export const queueNames = ["notification", "sms", "file-processing", "audit-log-cleanup"] as const;

export type JobQueueMap = Record<QueueName, Queue>;

/**
 * The four background queues, or `null` when this deployment has no Redis.
 *
 * Each queue gets its own connection rather than sharing the request client:
 * the request client gives up on a command in a second, which is right for a
 * cache read and wrong for a queue.
 */
export const queues: JobQueueMap | null = env.isRedisEnabled
  ? {
      notification: new Queue("notification", { connection: createQueueConnection() }),
      sms: new Queue("sms", { connection: createQueueConnection() }),
      "file-processing": new Queue("file-processing", { connection: createQueueConnection() }),
      "audit-log-cleanup": new Queue("audit-log-cleanup", { connection: createQueueConnection() })
    }
  : null;

/** For a caller that genuinely cannot proceed without a durable queue. */
export function requireQueue(name: QueueName): Queue {
  if (queues === null) {
    throw new RedisUnavailableError(`The ${name} queue`);
  }

  return queues[name];
}

/**
 * Hand a job to the queue, or run it here.
 *
 * This is where the on/off decision is made — once, rather than at each
 * producer. With Redis the job is durable and a worker picks it up. Without it
 * the job runs in this process, after the response. That is not durable and
 * does not pretend to be: every job this covers writes its database row first,
 * and the row is what survives a restart.
 */
export async function enqueue(
  name: QueueName,
  jobName: string,
  data: Record<string, unknown>,
  options: JobsOptions,
  runHere: () => Promise<void>
): Promise<void> {
  if (queues !== null) {
    await queues[name].add(jobName, data, options);

    return;
  }

  logger.info({ jobName, queue: name }, "Running the job in this process; Redis is disabled");
  runInProcess(jobName, runHere);
}
