import { Hono } from "hono";
import { createRouteHandler } from "uploadthing/server";

import { uploadthingRouter } from "@/lib/uploadthing-router";
import type { AppBindings } from "@/types/app-bindings";

const handlers = createRouteHandler({ router: uploadthingRouter });

export const uploadthingRoutes = new Hono<AppBindings>();

uploadthingRoutes.all("/*", (context) => handlers(context.req.raw));
