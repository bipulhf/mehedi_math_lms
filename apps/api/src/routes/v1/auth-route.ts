import { Hono } from "hono";

import { authController } from "@/lib/container";
import { requireAuth } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const authRoutes = new Hono<AppBindings>();

authRoutes.get("/session", requireAuth(), (context) => authController.getSession(context));
