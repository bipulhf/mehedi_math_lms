import type { Context } from "hono";

import { ProgressService } from "@/services/progress-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class ProgressController {
  public constructor(private readonly progressService: ProgressService) {}

  public async getCourseProgress(
    context: Context<AppBindings>,
    courseId: string,
    currentUserId: string
  ): Promise<Response> {
    const data = await this.progressService.getCourseProgress(courseId, currentUserId);

    return success(context, data);
  }

  public async markLectureComplete(
    context: Context<AppBindings>,
    lectureId: string,
    currentUserId: string
  ): Promise<Response> {
    const data = await this.progressService.markLectureComplete(lectureId, currentUserId);

    return success(context, data, 200, "Lecture marked as completed");
  }
}
