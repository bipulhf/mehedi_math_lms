import type { Context } from "hono";

import type { AuditLogService } from "@/services/audit-log-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class AuditLogController {
  public constructor(private readonly auditLogService: AuditLogService) {}

  public async list(
    context: Context<AppBindings>,
    query: Parameters<AuditLogService["list"]>[0]
  ): Promise<Response> {
    const result = await this.auditLogService.list(query);

    return paginated(context, result.items, {
      limit: query.limit,
      page: query.page,
      pages: Math.max(1, Math.ceil(result.total / query.limit)),
      total: result.total
    });
  }

  public async listActions(context: Context<AppBindings>): Promise<Response> {
    const actions = await this.auditLogService.listActions();

    return success(context, actions);
  }
}
