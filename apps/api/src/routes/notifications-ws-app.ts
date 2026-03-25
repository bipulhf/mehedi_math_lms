import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";

import { notificationRealtimeService } from "@/lib/container";
import { requireAuth } from "@/middleware/auth";
import { sessionContextMiddleware } from "@/middleware/session-context";
import type { AppBindings } from "@/types/app-bindings";
import { ForbiddenError } from "@/utils/errors";

export const notificationsWsApp = new Hono<AppBindings>();

notificationsWsApp.use("*", sessionContextMiddleware);
notificationsWsApp.use("*", requireAuth());

notificationsWsApp.get(
  "/api/v1/notifications/ws",
  upgradeWebSocket((context) => {
    const authUser = context.get("authUser");

    if (!authUser) {
      throw new ForbiddenError("Unauthorized websocket connection");
    }

    let connectionId = "";

    return {
      async onOpen(_event, socket) {
        const connection = await notificationRealtimeService.registerConnection(authUser.id, socket);

        connectionId = connection.connectionId;
      },
      async onClose() {
        if (!connectionId) {
          return;
        }

        await notificationRealtimeService.unregisterConnection(authUser.id, connectionId);
      },
      async onError() {
        if (!connectionId) {
          return;
        }

        await notificationRealtimeService.unregisterConnection(authUser.id, connectionId);
      }
    };
  })
);
