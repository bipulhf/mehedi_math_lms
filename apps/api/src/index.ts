import { app } from "@/app";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

if (import.meta.main) {
  Bun.serve({
    hostname: env.API_HOST,
    port: env.API_PORT,
    fetch: app.fetch
  });

  logger.info({
    host: env.API_HOST,
    port: env.API_PORT
  });
}

export default app;
