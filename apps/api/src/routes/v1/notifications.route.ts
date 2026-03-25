import { Hono } from "hono";

import {
  notificationIdParamsSchema,
  notificationsListQuerySchema,
  registerFcmDeviceSchema
} from "@mma/shared";

import { notificationController } from "@/lib/container";
import { requireAuth } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const notificationsRoutes = new Hono<AppBindings>();

notificationsRoutes.use("*", requireAuth());

notificationsRoutes.post("/register-device", async (context) => {
  const payload = registerFcmDeviceSchema.parse(await context.req.json());
  const authUser = context.get("authUser");

  return notificationController.registerDevice(context, payload, authUser!.id);
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

notificationsRoutes.put("/read-all", (context) => {
  const authUser = context.get("authUser");

  return notificationController.markAllRead(context, authUser!.id);
});

notificationsRoutes.put("/:id/read", (context) => {
  const params = notificationIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return notificationController.markRead(context, params.id, authUser!.id);
});
