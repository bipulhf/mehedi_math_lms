import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import type { UserRole, WebsocketClientEvent } from "@mma/shared";
import { websocketClientEventSchema } from "@mma/shared";

import { messageRealtimeService, messageService } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import { sessionContextMiddleware } from "@/middleware/session-context";
import type { AppBindings } from "@/types/app-bindings";
import { ForbiddenError } from "@/utils/errors";

export const messagesWsApp = new Hono<AppBindings>();

messagesWsApp.use("*", sessionContextMiddleware);
messagesWsApp.use("*", requireRole("STUDENT", "TEACHER"));

messagesWsApp.get(
  "/api/v1/messages/ws",
  upgradeWebSocket((context) => {
    const authUser = context.get("authUser");
    const authSession = context.get("authSession");

    if (!authUser || !authSession) {
      throw new ForbiddenError("Unauthorized websocket connection");
    }

    let connectionId = "";

    return {
      async onOpen(_event, socket) {
        const connection = await messageRealtimeService.registerConnection(authUser.id, socket);

        connectionId = connection.connectionId;
      },
      async onMessage(event) {
        const payload = websocketClientEventSchema.parse(JSON.parse(String(event.data))) as WebsocketClientEvent;

        if (payload.type === "message:read") {
          await messageService.markConversationRead(
            payload.conversationId,
            authUser.id,
            authSession.role as UserRole
          );
          return;
        }

        const typingEvent = await messageService.prepareTypingEvent(
          payload.conversationId,
          authUser.id,
          authSession.role as UserRole,
          payload.type
        );

        await messageRealtimeService.publish({
          conversationId: typingEvent.conversationId,
          data: {
            userId: typingEvent.userId
          },
          type: typingEvent.type,
          userIds: typingEvent.userIds
        });
      },
      async onClose() {
        if (!connectionId) {
          return;
        }

        await messageRealtimeService.unregisterConnection(authUser.id, connectionId);
      },
      async onError() {
        if (!connectionId) {
          return;
        }

        await messageRealtimeService.unregisterConnection(authUser.id, connectionId);
      }
    };
  })
);
