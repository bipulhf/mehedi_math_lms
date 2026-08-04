import "./load-root-env";

import { app } from "@/app";
import { env } from "@/lib/env";
import { messageRealtimeService } from "@/lib/container";
import { logger } from "@/lib/logger";
import { messagesWsApp } from "@/websocket/messages-ws-app";
import { notificationsWsApp } from "@/websocket/notifications-ws-app";
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

  // A restart or redeploy sends SIGTERM, not a close frame on every open
  // socket — without this, everyone connected at the moment of restart stays
  // "online" in Redis until a human clears it by hand. See
  // `MessageRealtimeService.releaseAllConnections`.
  const shutdown = async (): Promise<void> => {
    await messageRealtimeService.releaseAllConnections();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

export default app;
