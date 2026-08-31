import { apiGet, apiPost } from "@/src/lib/api-client";

/** Bug reports a student files from the app, and their own list of them. */

export interface BugReportRecord {
  adminNotes: string | null;
  createdAt: string;
  description: string;
  id: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  screenshotUrl: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  title: string;
  updatedAt: string;
}

export async function createBugReport(input: {
  description: string;
  screenshotUrl?: string | undefined;
  title: string;
}): Promise<BugReportRecord> {
  return apiPost<typeof input, BugReportRecord>("bugs", input);
}

export async function listMyBugReports(): Promise<readonly BugReportRecord[]> {
  return apiGet<readonly BugReportRecord[]>("bugs/me");
}
