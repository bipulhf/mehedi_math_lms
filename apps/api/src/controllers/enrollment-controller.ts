import type { Context } from "hono";
import type { UserRole } from "@mma/shared";

import { CommerceService } from "@/services/commerce-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class EnrollmentController {
  public constructor(private readonly commerceService: CommerceService) {}

  public async createEnrollment(
    context: Context<AppBindings>,
    courseId: string,
    callbackOrigin: string | undefined,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.commerceService.createEnrollment(
      courseId,
      currentUserId,
      currentUserRole,
      callbackOrigin
    );

    return success(context, data, 201, "Enrollment created successfully");
  }

  public async listMyEnrollments(
    context: Context<AppBindings>,
    currentUserId: string
  ): Promise<Response> {
    const data = await this.commerceService.listMyEnrollments(currentUserId);

    return success(context, data);
  }

  public async getMyCourseEnrollment(
    context: Context<AppBindings>,
    courseId: string,
    currentUserId: string
  ): Promise<Response> {
    const data = await this.commerceService.getMyCourseEnrollment(currentUserId, courseId);

    return success(context, data);
  }
}
