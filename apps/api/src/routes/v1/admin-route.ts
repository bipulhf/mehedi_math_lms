import { Hono } from "hono";
import type { UserRole } from "@genex/shared";
import {
  adminSendNotificationSchema,
  adminSendSmsSchema,
  adminSmsHistoryQuerySchema,
  adminUpdateBugSchema,
  adminUsersQuerySchema,
  auditLogsQuerySchema,
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
  auditLogController,
  auditLogService,
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
import { extractCreatedId } from "@/utils/audit";

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
  const authUser = context.get("authUser");
  const response = await landingController.updateFeaturedCourses(context, payload.courseIds);

  auditLogService.log({
    action: "landing.featured_updated",
    actorId: authUser!.id,
    entityId: "featured",
    entityType: "landing",
    metadata: { courseCount: payload.courseIds.length }
  });

  return response;
});

adminRoutes.get("/users", requireRole("ADMIN", "TEACHER"), (context) => {
  const query = adminUsersQuerySchema.parse(context.req.query());

  return adminUserController.listUsers(context, query);
});

adminRoutes.post("/users", requireAdmin(), async (context) => {
  const payload = createAdminUserSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await adminUserController.createUser(context, payload, authUser!.id);

  auditLogService.log({
    action: "user.created",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "user",
    metadata: { email: payload.email, role: payload.role }
  });

  return response;
});

adminRoutes.get("/users/:id", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = idParamsSchema.parse(context.req.param());

  return adminUserController.getUserById(context, params.id);
});

adminRoutes.put("/users/:id", requireAdmin(), async (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const payload = updateAdminUserSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await adminUserController.updateUser(context, params.id, payload);

  auditLogService.log({
    action: "user.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "user",
    metadata: { fields: Object.keys(payload).join(",") }
  });

  return response;
});

adminRoutes.patch("/users/:id/status", requireAdmin(), async (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const payload = updateAdminUserStatusSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await adminUserController.updateUserStatus(
    context,
    params.id,
    authUser!.id,
    payload.isActive
  );

  auditLogService.log({
    action: payload.isActive ? "user.reactivated" : "user.deactivated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "user"
  });

  return response;
});

adminRoutes.delete("/users/:id", requireAdmin(), async (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const response = await adminUserController.deleteUser(context, params.id, authUser!.id);

  auditLogService.log({
    action: "user.deleted",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "user"
  });

  return response;
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
  const authUser = context.get("authUser");
  const response = await bugReportController.updateBug(context, params.id, {
    adminNotes: payload.adminNotes && payload.adminNotes.trim().length > 0 ? payload.adminNotes : null,
    priority: payload.priority,
    status: payload.status
  });

  auditLogService.log({
    action: "bug_report.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "bug_report",
    metadata: { priority: payload.priority ?? null, status: payload.status ?? null }
  });

  return response;
});

adminRoutes.post("/courses/:id/approve", requireAdmin(), async (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const response = await courseController.approveCourse(context, params.id);

  auditLogService.log({
    action: "course.approved",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "course"
  });

  return response;
});

adminRoutes.post("/courses/:id/reject", requireAdmin(), async (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const payload = rejectCourseSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await courseController.rejectCourse(context, params.id, payload);

  auditLogService.log({
    action: "course.rejected",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "course"
  });

  return response;
});

adminRoutes.post("/notifications/send", requireRole("ADMIN", "TEACHER"), async (context) => {
  const payload = adminSendNotificationSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await notificationController.adminOrTeacherSend(
    context,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "notification.sent",
    actorId: authUser!.id,
    entityId: payload.target.kind,
    entityType: "notification",
    metadata: { targetKind: payload.target.kind, type: payload.type }
  });

  return response;
});

adminRoutes.get("/sms/status", requireAdmin(), (context) => smsController.providerStatus(context));

adminRoutes.post("/sms/send", requireAdmin(), async (context) => {
  const payload = adminSendSmsSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await smsController.queueSend(context, payload);

  auditLogService.log({
    action: "sms.sent",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "sms_batch",
    metadata: { targetKind: payload.target.kind }
  });

  return response;
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

adminRoutes.post("/message-reports/:id/resolve", requireAdmin(), async (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const response = await messageController.resolveReport(context, params.id, authUser!.id);

  auditLogService.log({
    action: "conversation_report.resolved",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "conversation_report"
  });

  return response;
});

adminRoutes.post("/messages/:id/hide", requireAdmin(), async (context) => {
  const params = idParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const response = await messageController.hideMessage(context, params.id, authUser!.id);

  auditLogService.log({
    action: "message.hidden",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "message"
  });

  return response;
});

adminRoutes.get("/logs", requireAdmin(), (context) => {
  const query = auditLogsQuerySchema.parse(context.req.query());

  return auditLogController.list(context, {
    action: query.action,
    actorSearch: query.actorSearch,
    from: query.from ? new Date(query.from) : undefined,
    limit: query.limit,
    page: query.page,
    to: query.to ? new Date(query.to) : undefined
  });
});

adminRoutes.get("/logs/actions", requireAdmin(), (context) => auditLogController.listActions(context));
