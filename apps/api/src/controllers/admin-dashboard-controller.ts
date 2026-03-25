import type { Context } from "hono";

import { AdminDashboardService } from "@/services/admin-dashboard-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class AdminDashboardController {
  public constructor(private readonly adminDashboardService: AdminDashboardService) {}

  public async getStats(context: Context<AppBindings>): Promise<Response> {
    const stats = await this.adminDashboardService.getStats();

    return success(context, stats);
  }
}
