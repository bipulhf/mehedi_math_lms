import { createBugReportSchema } from "@mma/shared";
import type { z } from "zod";

import { apiGet, apiPost } from "@/lib/api/client";

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
  user: {
    email: string;
    id: string;
    name: string;
    role: "STUDENT" | "TEACHER";
  };
}

export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;

export async function createBugReport(values: CreateBugReportInput): Promise<BugReportRecord> {
  const response = await apiPost<CreateBugReportInput, BugReportRecord>("bugs", values);

  return response.data;
}

export async function listMyBugReports(): Promise<readonly BugReportRecord[]> {
  const response = await apiGet<readonly BugReportRecord[]>("bugs/me");

  return response.data;
}
