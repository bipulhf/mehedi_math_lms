import type { Context } from "hono";

import type { HealthService } from "@/services/health-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  public getStatus(context: Context<AppBindings>): Response {
    return success(context, this.healthService.getStatus());
  }
}
