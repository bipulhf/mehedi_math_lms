import { z } from "zod";

import { userRoleSchema } from "../types/roles";

export const userListStatusValues = ["all", "active", "inactive"] as const;
export const userListStatusSchema = z.enum(userListStatusValues);

// ADMIN is creatable so a second administrator can be minted without shell
// access. Doing so requires the caller to re-enter their password. ADR-0002.
export const staffRoleValues = ["TEACHER", "ACCOUNTANT", "ADMIN"] as const;
export const staffRoleSchema = z.enum(staffRoleValues);

export const manageableUserRoleValues = ["STUDENT", "TEACHER", "ACCOUNTANT", "ADMIN"] as const;
export const manageableUserRoleSchema = z.enum(manageableUserRoleValues);

export const bugReportStatusValues = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export const bugReportStatusSchema = z.enum(bugReportStatusValues);

export const bugReportPriorityValues = ["LOW", "MEDIUM", "HIGH"] as const;
export const bugReportPrioritySchema = z.enum(bugReportPriorityValues);

export const idParamsSchema = z.object({
  id: z.string().uuid()
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  page: z.coerce.number().int().positive().default(1)
});

export const adminUsersQuerySchema = paginationQuerySchema.extend({
  role: userRoleSchema.optional(),
  search: z.string().trim().optional(),
  status: userListStatusSchema.default("all")
});

export const createAdminUserSchema = z.object({
  /** The calling admin's own password. Required only when role is ADMIN. */
  confirmPassword: z.string().min(1).max(128).optional(),
  email: z.email(),
  name: z.string().trim().min(1).max(255),
  role: staffRoleSchema
});

export const updateAdminUserSchema = z.object({
  email: z.email().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  role: manageableUserRoleSchema.optional()
});

export const updateAdminUserStatusSchema = z.object({
  isActive: z.boolean()
});

export const createBugReportSchema = z.object({
  description: z.string().trim().min(1).max(4000),
  screenshotUrl: z.string().trim().url().optional().or(z.literal("")),
  title: z.string().trim().min(1).max(255)
});

export const bugsQuerySchema = paginationQuerySchema.extend({
  priority: bugReportPrioritySchema.optional(),
  status: bugReportStatusSchema.optional()
});

export const adminUpdateBugSchema = z.object({
  adminNotes: z.string().trim().max(4000).optional().or(z.literal("")),
  priority: bugReportPrioritySchema.optional(),
  status: bugReportStatusSchema.optional()
});
