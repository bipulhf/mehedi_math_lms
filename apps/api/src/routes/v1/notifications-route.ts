import { Hono } from "hono";

import {
  notificationIdParamsSchema,
  notificationsListQuerySchema,
  registerFcmDeviceSchema
} from "@genex/shared";

import { auditLogService, notificationController } from "@/lib/container";
import { requireAuth } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const notificationsRoutes = new Hono<AppBindings>();

notificationsRoutes.use("*", requireAuth());

notificationsRoutes.post("/register-device", async (context) => {
  const payload = registerFcmDeviceSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await notificationController.registerDevice(context, payload, authUser!.id);

  auditLogService.log({
    action: "fcm_device.registered",
    actorId: authUser!.id,
    entityId: authUser!.id,
    entityType: "fcm_device",
    metadata: { deviceType: payload.deviceType }
  });

  return response;
});

notificationsRoutes.get("/", (context) => {
  const query = notificationsListQuerySchema.parse(context.req.query());
  const authUser = context.get("authUser");

  return notificationController.list(
    context,
    { limit: query.limit, page: query.page },
    authUser!.id
  );
});

notificationsRoutes.get("/unread-count", (context) => {
  const authUser = context.get("authUser");

  return notificationController.unreadCount(context, authUser!.id);
});

notificationsRoutes.put("/read-all", async (context) => {
  const authUser = context.get("authUser");
  const response = await notificationController.markAllRead(context, authUser!.id);

  auditLogService.log({
    action: "notification.read_all",
    actorId: authUser!.id,
    entityId: authUser!.id,
    entityType: "notification"
  });

  return response;
});

notificationsRoutes.put("/:id/read", async (context) => {
  const params = notificationIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const response = await notificationController.markRead(context, params.id, authUser!.id);

  auditLogService.log({
    action: "notification.read",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "notification"
  });

  return response;
});
