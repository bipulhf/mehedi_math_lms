import type { UpsertCourseRoutineInput, UserRole } from "@mma/shared";
import type { Context } from "hono";

import type { CourseRoutineService } from "@/services/course-routine-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class CourseRoutineController {
  public constructor(private readonly courseRoutineService: CourseRoutineService) {}

  public async getForCourse(
    context: Context<AppBindings>,
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    const routine = await this.courseRoutineService.getForCourse(courseId, userId, userRole);

    return success(context, routine);
  }

  public async saveForCourse(
    context: Context<AppBindings>,
    courseId: string,
    payload: UpsertCourseRoutineInput,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    const routine = await this.courseRoutineService.saveForCourse(
      courseId,
      payload,
      userId,
      userRole
    );

    return success(context, routine, 200, "Routine saved");
  }

  public async deleteForCourse(
    context: Context<AppBindings>,
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    await this.courseRoutineService.deleteForCourse(courseId, userId, userRole);

    return success(context, { deleted: true });
  }
}
