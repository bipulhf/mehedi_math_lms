import "./load-root-env";

import { app } from "@/app";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { messagesWsApp } from "@/routes/messages-ws-app";
import { notificationsWsApp } from "@/routes/notifications-ws-app";
import { websocket } from "hono/bun";

function resolveListenPort(): number {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && process.env.PORT !== undefined && process.env.PORT !== "") {
    const fromPlatform = Number(process.env.PORT);
    if (Number.isInteger(fromPlatform) && fromPlatform >= 1 && fromPlatform <= 65535) {
      return fromPlatform;
    }
  }

  const fromConfig = env.API_PORT;
  if (Number.isInteger(fromConfig) && fromConfig >= 1 && fromConfig <= 65535) {
    return fromConfig;
  }

  return 3001;
}

if (import.meta.main) {
  const listenPort = resolveListenPort();

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
    development: false,
    hostname: env.API_HOST,
    port: listenPort,
    websocket
  });

  logger.info({
    host: env.API_HOST,
    port: listenPort
  });
}

export default app;
