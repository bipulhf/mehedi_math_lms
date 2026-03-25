import type { Context } from "hono";

import { BugReportService, type CreateBugReportRequest, type UpdateBugReportRequest } from "@/services/bug-report-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class BugReportController {
  public constructor(private readonly bugReportService: BugReportService) {}

  public async createBugReport(
    context: Context<AppBindings>,
    userId: string,
    input: CreateBugReportRequest
  ): Promise<Response> {
    const bugReport = await this.bugReportService.createBugReport(userId, input);

    return success(context, bugReport, 201, "Bug report submitted successfully");
  }

  public async listMine(context: Context<AppBindings>, userId: string): Promise<Response> {
    const bugReports = await this.bugReportService.listMine(userId);

    return success(context, bugReports);
  }

  public async listAll(
    context: Context<AppBindings>,
    query: Parameters<BugReportService["listAll"]>[0]
  ): Promise<Response> {
    const result = await this.bugReportService.listAll(query);

    return paginated(context, result.items, {
      limit: query.limit,
      page: query.page,
      pages: Math.max(1, Math.ceil(result.total / query.limit)),
      total: result.total
    });
  }

  public async getById(context: Context<AppBindings>, id: string): Promise<Response> {
    const bugReport = await this.bugReportService.getById(id);

    return success(context, bugReport);
  }

  public async updateBug(
    context: Context<AppBindings>,
    id: string,
    input: UpdateBugReportRequest
  ): Promise<Response> {
    const bugReport = await this.bugReportService.updateBug(id, input);

    return success(context, bugReport, 200, "Bug report updated successfully");
  }
}
