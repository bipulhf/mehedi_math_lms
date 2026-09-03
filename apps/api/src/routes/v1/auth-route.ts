import { Hono } from "hono";

import { authController, deviceController } from "@/lib/container";
import { requireAuth } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const authRoutes = new Hono<AppBindings>();

authRoutes.get("/session", requireAuth(), (context) => authController.getSession(context));

// The mobile app naming the device behind a session it did not open itself.
// Google sign-in happens in an in-app browser that carries none of the app's
// headers, so without this every Google sign-in would look like an unknown
// device and spend one of the account's two slots. ADR-0019.
authRoutes.post("/device", requireAuth(), (context) => deviceController.claimSession(context));
