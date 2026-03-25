import { AdminController } from "@/controllers/admin-controller";
import { AuthController } from "@/controllers/auth-controller";
import { HealthController } from "@/controllers/health-controller";
import { NotImplementedController } from "@/controllers/not-implemented-controller";
import { queues } from "@/lib/queues";
import { redis } from "@/lib/redis";
import { AuthSessionRepository } from "@/repositories/auth-session-repository";
import { HealthRepository } from "@/repositories/health-repository";
import { StaffAccountRepository } from "@/repositories/staff-account-repository";
import { AuthGuardService } from "@/services/auth-guard-service";
import { HealthService } from "@/services/health-service";
import { NotImplementedService } from "@/services/not-implemented-service";
import { StaffAccountService } from "@/services/staff-account-service";

const healthRepository = new HealthRepository(redis, queues);
const authSessionRepository = new AuthSessionRepository();
const staffAccountRepository = new StaffAccountRepository();
const healthService = new HealthService(healthRepository);
const authGuardService = new AuthGuardService(authSessionRepository);
const staffAccountService = new StaffAccountService(staffAccountRepository);
const notImplementedService = new NotImplementedService();

export const adminController = new AdminController(staffAccountService);
export const authController = new AuthController();
export { authGuardService };
export const healthController = new HealthController(healthService);
export const notImplementedController = new NotImplementedController(notImplementedService);
