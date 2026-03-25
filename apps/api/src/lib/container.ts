import { HealthController } from "@/controllers/health-controller";
import { NotImplementedController } from "@/controllers/not-implemented-controller";
import { queues } from "@/lib/queues";
import { redis } from "@/lib/redis";
import { HealthRepository } from "@/repositories/health-repository";
import { HealthService } from "@/services/health-service";
import { NotImplementedService } from "@/services/not-implemented-service";

const healthRepository = new HealthRepository(redis, queues);
const healthService = new HealthService(healthRepository);
const notImplementedService = new NotImplementedService();

export const healthController = new HealthController(healthService);
export const notImplementedController = new NotImplementedController(notImplementedService);
