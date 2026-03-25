import { app } from "@/app";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { messagesWsApp } from "@/routes/messages-ws-app";
import { notificationsWsApp } from "@/routes/notifications-ws-app";
import { websocket } from "hono/bun";

if (import.meta.main) {
  Bun.serve({
    async fetch(request, server) {
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/messages/ws") {
        return messagesWsApp.fetch(request, server);
      }

      if (url.pathname === "/api/v1/notifications/ws") {
        return notificationsWsApp.fetch(request, server);
      }

      return app.fetch(request, server);
    },
    hostname: env.API_HOST,
    port: env.API_PORT || 3001,
    websocket
  });

  logger.info({
    host: env.API_HOST,
    port: env.API_PORT || 3001
  });
}

export default app;
