import { Hono } from "hono";

import { healthController } from "@/lib/container";
import type { AppBindings } from "@/types/app-bindings";

export const healthRoutes = new Hono<AppBindings>();

healthRoutes.get("/", (context) => healthController.getStatus(context));
