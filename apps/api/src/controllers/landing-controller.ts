import type { Context } from "hono";

import type { LandingService } from "@/services/landing-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class LandingController {
  public constructor(private readonly landingService: LandingService) {}

  public async getSnapshot(context: Context<AppBindings>): Promise<Response> {
    const snapshot = await this.landingService.getSnapshot();

    return success(context, snapshot);
  }

  public async getFeaturedCourses(context: Context<AppBindings>): Promise<Response> {
    const courses = await this.landingService.getFeaturedCourses();

    return success(context, courses);
  }

  public async updateFeaturedCourses(context: Context<AppBindings>, courseIds: readonly string[]): Promise<Response> {
    await this.landingService.updateFeaturedCourses(courseIds);

    return success(context, null);
  }
}
