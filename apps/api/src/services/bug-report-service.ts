import {
  BugReportRepository,
  type BugReportQuery,
  type BugReportRecord
} from "@/repositories/bug-report-repository";
import { NotFoundError } from "@/utils/errors";

export interface CreateBugReportRequest {
  description: string;
  screenshotUrl: string | null;
  title: string;
}

export interface UpdateBugReportRequest {
  adminNotes?: string | null | undefined;
  priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | undefined;
}

export class BugReportService {
  public constructor(private readonly bugReportRepository: BugReportRepository) {}

  public async createBugReport(userId: string, input: CreateBugReportRequest): Promise<BugReportRecord> {
    return this.bugReportRepository.create({
      description: input.description,
      screenshotUrl: input.screenshotUrl,
      title: input.title,
      userId
    });
  }

  public async listMine(userId: string): Promise<readonly BugReportRecord[]> {
    return this.bugReportRepository.listMine(userId);
  }

  public async listAll(
    query: BugReportQuery
  ): Promise<{ items: readonly BugReportRecord[]; total: number }> {
    return this.bugReportRepository.listAll(query);
  }

  public async getById(id: string): Promise<BugReportRecord> {
    const bugReport = await this.bugReportRepository.findById(id);

    if (!bugReport) {
      throw new NotFoundError("Bug report not found");
    }

    return bugReport;
  }

  public async updateBug(id: string, input: UpdateBugReportRequest): Promise<BugReportRecord> {
    const nextStatus = input.status;
    const updatedBug = await this.bugReportRepository.update(id, {
      adminNotes: input.adminNotes,
      priority: input.priority,
      resolvedAt:
        nextStatus === "RESOLVED" || nextStatus === "CLOSED"
          ? new Date()
          : nextStatus === "OPEN" || nextStatus === "IN_PROGRESS"
            ? null
            : undefined,
      status: nextStatus
    });

    if (!updatedBug) {
      throw new NotFoundError("Bug report not found");
    }

    return updatedBug;
  }
}
