import { Hono } from "hono";
import {
  adminUpdateBugSchema,
  adminUsersQuerySchema,
  bugsQuerySchema,
  createAdminUserSchema,
  idParamsSchema,
  profileIdParamsSchema,
  updateAdminUserSchema,
  updateAdminUserStatusSchema
} from "@mma/shared";

import {
  adminDashboardController,
  adminUserController,
  bugReportController,
  profileController
} from "@/lib/container";
import { requireAdmin } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const adminRoutes = new Hono<AppBindings>();

adminRoutes.get("/dashboard", requireAdmin(), (context) => adminDashboardController.getStats(context));

adminRoutes.get("/users", requireAdmin(), (context) => {
  const query = adminUsersQuerySchema.parse(context.req.query());

  return adminUserController.listUsers(context, query);
});

adminRoutes.post("/users", requireAdmin(), async (context) => {
  const payload = createAdminUserSchema.parse(await context.req.json());

  return adminUserController.createUser(context, payload);
});

adminRoutes.get("/users/:id", requireAdmin(), (context) => {
  const params = idParamsSchema.parse(context.req.param());

  return adminUserController.getUserById(context, params.id);
});

adminRoutes.put("/users/:id", requireAdmin(), async (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const payload = updateAdminUserSchema.parse(await context.req.json());

  return adminUserController.updateUser(context, params.id, payload);
});

adminRoutes.patch("/users/:id/status", requireAdmin(), async (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const payload = updateAdminUserStatusSchema.parse(await context.req.json());
  const authUser = context.get("authUser");

  return adminUserController.updateUserStatus(context, params.id, authUser!.id, payload.isActive);
});

adminRoutes.delete("/users/:id", requireAdmin(), (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return adminUserController.deleteUser(context, params.id, authUser!.id);
});

adminRoutes.get("/users/:id/profile", requireAdmin(), async (context) => {
  const params = profileIdParamsSchema.parse(context.req.param());

  return profileController.getAdminStudentProfile(context, params.id);
});

adminRoutes.get("/bugs", requireAdmin(), (context) => {
  const query = bugsQuerySchema.parse(context.req.query());

  return bugReportController.listAll(context, query);
});

adminRoutes.get("/bugs/:id", requireAdmin(), (context) => {
  const params = idParamsSchema.parse(context.req.param());

  return bugReportController.getById(context, params.id);
});

adminRoutes.patch("/bugs/:id", requireAdmin(), async (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const payload = adminUpdateBugSchema.parse(await context.req.json());

  return bugReportController.updateBug(context, params.id, {
    adminNotes: payload.adminNotes && payload.adminNotes.trim().length > 0 ? payload.adminNotes : null,
    priority: payload.priority,
    status: payload.status
  });
});
