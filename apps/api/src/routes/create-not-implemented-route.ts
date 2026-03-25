import { Hono } from "hono";

import { notImplementedController } from "@/lib/container";
import type { AppBindings } from "@/types/app-bindings";

export function createNotImplementedRoute(namespace: string): Hono<AppBindings> {
  const route = new Hono<AppBindings>();

  route.all("*", (context) => notImplementedController.handle(context, namespace));

  return route;
}
