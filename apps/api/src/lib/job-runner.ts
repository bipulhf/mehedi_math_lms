import { logger } from "@/lib/logger";

/**
 * Background work for a deployment with no queue.
 *
 * When `REDIS_ENABLED=false` there is no worker to pick a job up, so it runs
 * here — after the response, never inside it. An admin sending an SMS broadcast
 * to four hundred students should not wait on the gateway, and a video upload
 * should not wait on metadata parsing.
 *
 * What this deliberately does not do is pretend to be a queue. There are no
 * retries and nothing survives a restart. Every job routed through it writes
 * its database row first — a `QUEUED` SMS batch, an `uploads` row — so the
 * record of what should have happened is durable even though the attempt is
 * not, and a restart leaves something an operator can resend rather than
 * silence.
 *
 * A failure is logged and goes no further: the request it came from has already
 * been answered, and an unhandled rejection here would take the process down.
 */
export function runInProcess(jobName: string, run: () => Promise<void>): void {
  // A macrotask, so the response is flushed before the work starts rather than
  // competing with it on the same tick.
  setTimeout(() => {
    void run()
      .then(() => {
        logger.info({ jobName }, "In-process job finished");
      })
      .catch((error: unknown) => {
        logger.error({ err: error, jobName }, "In-process job failed");
      });
  }, 0);
}
