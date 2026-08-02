import { Hono } from "hono";

import { landingController } from "@/lib/container";
import type { AppBindings } from "@/types/app-bindings";

export const landingRoutes = new Hono<AppBindings>();

// Public by design: the homepage is the most crawled page on the site and
// nothing here is user-scoped.
landingRoutes.get("/", (context) => {
  return landingController.getSnapshot(context);
});
