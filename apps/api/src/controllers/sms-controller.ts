import type { Context } from "hono";
import type { AdminSendSmsInput, AdminSmsHistoryQuery } from "@mma/shared";

import { SmsService } from "@/services/sms-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class SmsController {
  public constructor(private readonly smsService: SmsService) {}

  public async queueSend(context: Context<AppBindings>, payload: AdminSendSmsInput): Promise<Response> {
    const authUser = context.get("authUser");
    const data = await this.smsService.queueBulkSend(authUser!.id, payload);

    return success(context, data, 202, "SMS batch queued");
  }

  public async listHistory(context: Context<AppBindings>, query: AdminSmsHistoryQuery): Promise<Response> {
    const result = await this.smsService.listHistory(query);

    return paginated(context, result.items, {
      limit: result.limit,
      page: result.page,
      pages: Math.ceil(result.total / result.limit) || 1,
      total: result.total
    });
  }

  public async providerStatus(context: Context<AppBindings>): Promise<Response> {
    const data = this.smsService.getProviderReadiness();

    return success(context, data);
  }
}
