import type { Context } from "hono";
import type { AdminSendNotificationInput, RegisterFcmDeviceInput } from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { NotificationService } from "@/services/notification-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class NotificationController {
  public constructor(private readonly notificationService: NotificationService) {}

  public async registerDevice(
    context: Context<AppBindings>,
    payload: RegisterFcmDeviceInput,
    userId: string
  ): Promise<Response> {
    await this.notificationService.registerDevice(userId, payload);

    return success(context, { registered: true }, 201, "Device registered");
  }

  public async list(
    context: Context<AppBindings>,
    query: { limit: number; page: number },
    userId: string
  ): Promise<Response> {
    const result = await this.notificationService.listForUser(userId, query);

    return paginated(context, result.items, {
      limit: result.limit,
      page: result.page,
      pages: Math.ceil(result.total / result.limit) || 1,
      total: result.total
    });
  }

  public async unreadCount(context: Context<AppBindings>, userId: string): Promise<Response> {
    const count = await this.notificationService.getUnreadCount(userId);

    return success(context, { count });
  }

  public async markRead(context: Context<AppBindings>, id: string, userId: string): Promise<Response> {
    const data = await this.notificationService.markRead(id, userId);

    return success(context, data);
  }

  public async markAllRead(context: Context<AppBindings>, userId: string): Promise<Response> {
    const data = await this.notificationService.markAllRead(userId);

    return success(context, data);
  }

  public async adminOrTeacherSend(
    context: Context<AppBindings>,
    payload: AdminSendNotificationInput,
    senderId: string,
    senderRole: UserRole
  ): Promise<Response> {
    const data = await this.notificationService.adminOrTeacherSend(payload, senderId, senderRole);

    return success(context, data, 202, "Notifications queued");
  }
}
