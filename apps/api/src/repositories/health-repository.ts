import type Redis from "ioredis";

import type { JobQueueMap } from "@/lib/queues";

export interface HealthSnapshot {
  redisEnabled: boolean;
  /** ioredis's own word for the socket, or "disabled" when there is no Redis. */
  redisStatus: string;
  queueNames: readonly string[];
}

export class HealthRepository {
  public constructor(
    private readonly redis: Redis | null,
    private readonly queues: JobQueueMap | null
  ) {}

  public getSnapshot(): HealthSnapshot {
    return {
      queueNames: this.queues === null ? [] : Object.keys(this.queues),
      redisEnabled: this.redis !== null,
      redisStatus: this.redis?.status ?? "disabled"
    };
  }
}
