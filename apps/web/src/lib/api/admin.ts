import {
  adminUpdateBugSchema,
  adminUsersQuerySchema,
  bugReportPrioritySchema,
  bugReportStatusSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  updateAdminUserStatusSchema,
  userListStatusSchema,
  type AdminSendNotificationInput,
  type UserRole
} from "@mma/shared";
import type { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut, type PaginatedEnvelope } from "@/lib/api/client";

export interface AdminDashboardStats {
  activeCourses: number;
  openBugs: number;
  pendingCourseApprovals: number;
  revenue: number;
  totalEnrollments: number;
  totalStudents: number;
}

export interface AdminUserListItem {
  createdAt: string;
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  profileCompleted: boolean;
  role: UserRole;
}

export interface AdminUserDetail extends AdminUserListItem {
  bugReports: readonly {
    createdAt: string;
    id: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    title: string;
  }[];
  image: string | null;
  sessionHistory: readonly {
    createdAt: string;
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
  }[];
  slug: string | null;
  studentProfile: {
    classOrGrade: string | null;
    institution: string | null;
    phone: string | null;
  } | null;
  teacherProfile: {
    phone: string | null;
    qualifications: string | null;
    specializations: string | null;
  } | null;
}

export interface AdminBugRecord {
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
    role: UserRole;
  };
}

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type UpdateAdminUserStatusInput = z.infer<typeof updateAdminUserStatusSchema>;
export type AdminUpdateBugInput = z.infer<typeof adminUpdateBugSchema>;

function buildQueryString(query: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const response = await apiGet<AdminDashboardStats>("admin/dashboard");

  return response.data;
}

export async function listAdminUsers(
  query: Partial<AdminUsersQuery>
): Promise<PaginatedEnvelope<AdminUserListItem>> {
  return apiGet<readonly AdminUserListItem[]>(
    `admin/users${buildQueryString({
      limit: query.limit,
      page: query.page,
      role: query.role,
      search: query.search,
      status: query.status
    })}`
  ) as Promise<PaginatedEnvelope<AdminUserListItem>>;
}

export async function createAdminUser(values: CreateAdminUserInput): Promise<{
  email: string;
  id: string;
  temporaryPassword: string;
}> {
  const response = await apiPost<CreateAdminUserInput, { email: string; id: string; temporaryPassword: string }>(
    "admin/users",
    values
  );

  return response.data;
}

export async function getAdminUser(id: string): Promise<AdminUserDetail> {
  const response = await apiGet<AdminUserDetail>(`admin/users/${id}`);

  return response.data;
}

export async function updateAdminUser(id: string, values: UpdateAdminUserInput): Promise<AdminUserListItem> {
  const response = await apiPut<UpdateAdminUserInput, AdminUserListItem>(`admin/users/${id}`, values);

  return response.data;
}

export async function updateAdminUserStatus(
  id: string,
  values: UpdateAdminUserStatusInput
): Promise<AdminUserListItem> {
  const response = await apiPatch<UpdateAdminUserStatusInput, AdminUserListItem>(
    `admin/users/${id}/status`,
    values
  );

  return response.data;
}

export async function deleteAdminUser(id: string): Promise<AdminUserListItem> {
  const response = await apiDelete<AdminUserListItem>(`admin/users/${id}`);

  return response.data;
}

export async function listAdminBugs(query: {
  limit?: number | undefined;
  page?: number | undefined;
  priority?: z.infer<typeof bugReportPrioritySchema> | undefined;
  status?: z.infer<typeof bugReportStatusSchema> | undefined;
}): Promise<PaginatedEnvelope<AdminBugRecord>> {
  return apiGet<readonly AdminBugRecord[]>(
    `admin/bugs${buildQueryString({
      limit: query.limit,
      page: query.page,
      priority: query.priority,
      status: query.status
    })}`
  ) as Promise<PaginatedEnvelope<AdminBugRecord>>;
}

export async function getAdminBug(id: string): Promise<AdminBugRecord> {
  const response = await apiGet<AdminBugRecord>(`admin/bugs/${id}`);

  return response.data;
}

export async function updateAdminBug(id: string, values: AdminUpdateBugInput): Promise<AdminBugRecord> {
  const response = await apiPatch<AdminUpdateBugInput, AdminBugRecord>(`admin/bugs/${id}`, values);

  return response.data;
}

export async function adminSendNotification(
  input: AdminSendNotificationInput
): Promise<{ delivered: number }> {
  const response = await apiPost<AdminSendNotificationInput, { delivered: number }>(
    "admin/notifications/send",
    input
  );

  return response.data;
}

export { userListStatusSchema };
