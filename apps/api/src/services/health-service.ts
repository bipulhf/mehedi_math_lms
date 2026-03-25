import { env } from "@/lib/env";
import type { HealthSnapshot } from "@/repositories/health-repository";
import { HealthRepository } from "@/repositories/health-repository";

export interface HealthStatus {
  appName: string;
  environment: string;
  timestamp: string;
  uptimeInSeconds: number;
  redisStatus: string;
  queues: readonly string[];
}

export class HealthService {
  public constructor(private readonly healthRepository: HealthRepository) {}

  public getStatus(): HealthStatus {
    const snapshot: HealthSnapshot = this.healthRepository.getSnapshot();

    return {
      appName: env.APP_NAME,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeInSeconds: Math.floor(process.uptime()),
      redisStatus: snapshot.redisStatus,
      queues: snapshot.queueNames
    };
  }
}
