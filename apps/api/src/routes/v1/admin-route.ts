import { Hono } from "hono";
import type { UserRole } from "@genex/shared";
import {
  adminSendNotificationSchema,
  adminSendSmsSchema,
  adminSmsHistoryQuerySchema,
  adminUpdateBugSchema,
  adminUsersQuerySchema,
  bugsQuerySchema,
  conversationMessagesQuerySchema,
  courseIdParamsSchema,
  createAdminUserSchema,
  featuredCoursesSchema,
  idParamsSchema,
  messageConversationIdParamsSchema,
  profileIdParamsSchema,
  rejectCourseSchema,
  updateAdminUserSchema,
  updateAdminUserStatusSchema
} from "@genex/shared";

import {
  adminDashboardController,
  adminUserController,
  bugReportController,
  courseController,
  landingController,
  messageController,
  notificationController,
  profileController,
  smsController
} from "@/lib/container";
import { requireAdmin, requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const adminRoutes = new Hono<AppBindings>();

adminRoutes.get("/dashboard", requireAdmin(), (context) => adminDashboardController.getStats(context));

// The landing carousel. Admin pins an ordered list of up to six published
// courses; an empty list resets the carousel to newest-first. Writes bust the
// landing snapshot cache.
adminRoutes.get("/landing/featured", requireAdmin(), (context) => {
  return landingController.getFeaturedCourses(context);
});

adminRoutes.put("/landing/featured", requireAdmin(), async (context) => {
  const payload = featuredCoursesSchema.parse(await context.req.json());

  return landingController.updateFeaturedCourses(context, payload.courseIds);
});

adminRoutes.get("/users", requireRole("ADMIN", "TEACHER"), (context) => {
  const query = adminUsersQuerySchema.parse(context.req.query());

  return adminUserController.listUsers(context, query);
});

adminRoutes.post("/users", requireAdmin(), async (context) => {
  const payload = createAdminUserSchema.parse(await context.req.json());
  const authUser = context.get("authUser");

  return adminUserController.createUser(context, payload, authUser!.id);
});

adminRoutes.get("/users/:id", requireRole("ADMIN", "TEACHER"), (context) => {
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

adminRoutes.get("/users/:id/profile", requireRole("ADMIN", "TEACHER"), async (context) => {
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

adminRoutes.post("/courses/:id/approve", requireAdmin(), (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());

  return courseController.approveCourse(context, params.id);
});

adminRoutes.post("/courses/:id/reject", requireAdmin(), async (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const payload = rejectCourseSchema.parse(await context.req.json());

  return courseController.rejectCourse(context, params.id, payload);
});

adminRoutes.post("/notifications/send", requireRole("ADMIN", "TEACHER"), async (context) => {
  const payload = adminSendNotificationSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return notificationController.adminOrTeacherSend(
    context,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

adminRoutes.get("/sms/status", requireAdmin(), (context) => smsController.providerStatus(context));

adminRoutes.post("/sms/send", requireAdmin(), async (context) => {
  const payload = adminSendSmsSchema.parse(await context.req.json());

  return smsController.queueSend(context, payload);
});

adminRoutes.get("/sms/history", requireAdmin(), (context) => {
  const query = adminSmsHistoryQuerySchema.parse(context.req.query());

  return smsController.listHistory(context, query);
});

// Message moderation. An admin may read a conversation only while a report
// about it is open, and every such read is written to the access log. ADR-0004.
adminRoutes.get("/message-reports", requireAdmin(), (context) => {
  return messageController.listOpenReports(context);
});

adminRoutes.get("/message-reports/conversations/:id", requireAdmin(), (context) => {
  const params = messageConversationIdParamsSchema.parse(context.req.param());
  const query = conversationMessagesQuerySchema.parse(context.req.query());
  const authUser = context.get("authUser");

  return messageController.reviewReportedConversation(context, params.id, query, authUser!.id);
});

adminRoutes.post("/message-reports/:id/resolve", requireAdmin(), (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return messageController.resolveReport(context, params.id, authUser!.id);
});

adminRoutes.post("/messages/:id/hide", requireAdmin(), (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return messageController.hideMessage(context, params.id, authUser!.id);
});
