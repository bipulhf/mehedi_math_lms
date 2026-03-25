import type { Context } from "hono";
import type { UserRole } from "@mma/shared";

import { AnalyticsService } from "@/services/analytics-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class AnalyticsController {
  public constructor(private readonly analyticsService: AnalyticsService) {}

  public async adminOverview(context: Context<AppBindings>): Promise<Response> {
    const data = await this.analyticsService.adminOverview();

    return success(context, data);
  }

  public async teacherOverview(context: Context<AppBindings>, teacherId: string): Promise<Response> {
    const data = await this.analyticsService.teacherOverview(teacherId);

    return success(context, data);
  }

  public async accountantOverview(context: Context<AppBindings>): Promise<Response> {
    const data = await this.analyticsService.accountantOverview();

    return success(context, data);
  }

  public async courseAnalytics(
    context: Context<AppBindings>,
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    const data = await this.analyticsService.courseAnalytics(courseId, userId, userRole);

    return success(context, data);
  }
}
