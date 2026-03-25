import type Redis from "ioredis";

import type { JobQueueMap } from "@/lib/queues";

export interface HealthSnapshot {
  redisStatus: string;
  queueNames: readonly string[];
}

export class HealthRepository {
  public constructor(
    private readonly redis: Redis,
    private readonly queues: JobQueueMap
  ) {}

  public getSnapshot(): HealthSnapshot {
    return {
      redisStatus: this.redis.status,
      queueNames: Object.keys(this.queues)
    };
  }
}
