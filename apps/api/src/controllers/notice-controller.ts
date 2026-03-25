import type { Context } from "hono";
import type {
  CreateCourseNoticeInput,
  UpdateCourseNoticeInput,
  UserRole
} from "@mma/shared";

import { NoticeService } from "@/services/notice-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class NoticeController {
  public constructor(private readonly noticeService: NoticeService) {}

  public async listForCourse(
    context: Context<AppBindings>,
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    const items = await this.noticeService.listForCourse(courseId, userId, userRole);

    return success(context, { items });
  }

  public async createForCourse(
    context: Context<AppBindings>,
    courseId: string,
    payload: CreateCourseNoticeInput,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    const data = await this.noticeService.createNotice(courseId, payload, userId, userRole);

    return success(context, data, 201, "Notice created");
  }

  public async updateNotice(
    context: Context<AppBindings>,
    noticeId: string,
    payload: UpdateCourseNoticeInput,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    const data = await this.noticeService.updateNotice(noticeId, payload, userId, userRole);

    return success(context, data);
  }

  public async deleteNotice(
    context: Context<AppBindings>,
    noticeId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    await this.noticeService.deleteNotice(noticeId, userId, userRole);

    return success(context, { deleted: true });
  }
}
