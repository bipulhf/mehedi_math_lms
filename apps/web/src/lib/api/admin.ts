import type {
  adminUpdateBugSchema,
  adminUsersQuerySchema,
  auditLogsQuerySchema,
  deviceConflictsQuerySchema,
  resolveDeviceConflictSchema,
  bugReportPrioritySchema,
  bugReportStatusSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  updateAdminUserStatusSchema} from "@genex/shared";
import {
  userListStatusSchema,
  type AdminSendNotificationInput,
  type AdminSendSmsInput,
  type DeviceConflictStatus,
  type UserRole
} from "@genex/shared";
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

export interface AdminAuditLogRecord {
  action: string;
  actor: {
    email: string;
    id: string;
    name: string;
  } | null;
  createdAt: string;
  entityId: string;
  entityType: string;
  id: string;
  metadata: Record<string, string | number | boolean | null> | null;
}

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type UpdateAdminUserStatusInput = z.infer<typeof updateAdminUserStatusSchema>;
export type AdminUpdateBugInput = z.infer<typeof adminUpdateBugSchema>;
export type AdminAuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;

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

export async function deleteAdminUser(id: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`admin/users/${id}`);

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

export interface AdminSmsBatchRow {
  completedAt: string | null;
  courseId: string | null;
  createdAt: string;
  createdByName: string;
  failedCount: number;
  id: string;
  messageBody: string;
  providerLastResponse: string | null;
  sentCount: number;
  skippedCount: number;
  status: string;
  targetKind: string;
  targetRole: string | null;
  totalRecipients: number;
}

export interface AdminSmsStatus {
  configured: boolean;
  /** "in-process" when the deployment runs without Redis. */
  deliveryMode: "in-process" | "queued";
}

export async function getAdminSmsStatus(): Promise<AdminSmsStatus> {
  const response = await apiGet<AdminSmsStatus>("admin/sms/status");

  return response.data;
}

export async function adminSendBulkSms(input: AdminSendSmsInput): Promise<{ batchId: string }> {
  const response = await apiPost<AdminSendSmsInput, { batchId: string }>("admin/sms/send", input);

  return response.data;
}

export async function listAdminSmsHistory(params: {
  limit: number;
  page: number;
}): Promise<PaginatedEnvelope<AdminSmsBatchRow>> {
  return apiGet<readonly AdminSmsBatchRow[]>(
    `admin/sms/history${buildQueryString({
      limit: params.limit,
      page: params.page
    })}`
  ) as Promise<PaginatedEnvelope<AdminSmsBatchRow>>;
}

export async function listAdminAuditLogs(
  query: Partial<AdminAuditLogsQuery>
): Promise<PaginatedEnvelope<AdminAuditLogRecord>> {
  return apiGet<readonly AdminAuditLogRecord[]>(
    `admin/logs${buildQueryString({
      action: query.action,
      actorSearch: query.actorSearch,
      from: query.from,
      limit: query.limit,
      page: query.page,
      to: query.to
    })}`
  ) as Promise<PaginatedEnvelope<AdminAuditLogRecord>>;
}

export async function listAdminAuditLogActions(): Promise<readonly string[]> {
  const response = await apiGet<readonly string[]>("admin/logs/actions");

  return response.data;
}

export interface AdminDeviceConflictRecord {
  activeDeviceCount: number;
  attemptedDeviceId: string | null;
  attemptedIpAddress: string | null;
  attemptedPlatform: string;
  attemptedUserAgent: string | null;
  createdAt: string;
  deviceLimit: number;
  id: string;
  note: string | null;
  reviewedAt: string | null;
  status: DeviceConflictStatus;
  user: {
    email: string;
    id: string;
    isActive: boolean;
    multiDeviceAllowed: boolean;
    name: string;
  };
}

export interface AdminUserDeviceRecord {
  deviceId: string;
  firstSeenAt: string;
  hasLiveSession: boolean;
  id: string;
  lastIpAddress: string | null;
  lastSeenAt: string;
  platform: string;
  userAgent: string | null;
}

export type AdminDeviceConflictsQuery = z.infer<typeof deviceConflictsQuerySchema>;

export async function listAdminDeviceConflicts(
  query: AdminDeviceConflictsQuery
): Promise<PaginatedEnvelope<AdminDeviceConflictRecord>> {
  return apiGet<readonly AdminDeviceConflictRecord[]>(
    `admin/device-conflicts${buildQueryString({
      limit: query.limit,
      page: query.page,
      search: query.search,
      status: query.status
    })}`
  ) as Promise<PaginatedEnvelope<AdminDeviceConflictRecord>>;
}

export async function resolveAdminDeviceConflict(
  conflictId: string,
  input: z.infer<typeof resolveDeviceConflictSchema>
): Promise<void> {
  await apiPatch<typeof input, { id: string }>(`admin/device-conflicts/${conflictId}`, input);
}

export async function listAdminUserDevices(
  userId: string
): Promise<readonly AdminUserDeviceRecord[]> {
  const response = await apiGet<readonly AdminUserDeviceRecord[]>(`admin/users/${userId}/devices`);

  return response.data;
}

export async function setAdminUserDevicePolicy(
  userId: string,
  multiDeviceAllowed: boolean
): Promise<void> {
  await apiPatch<{ multiDeviceAllowed: boolean }, { userId: string }>(
    `admin/users/${userId}/device-policy`,
    { multiDeviceAllowed }
  );
}

export async function resetAdminUserDevices(userId: string): Promise<void> {
  await apiPost<Record<string, never>, { userId: string }>(
    `admin/users/${userId}/devices/reset`,
    {}
  );
}

export { userListStatusSchema };
