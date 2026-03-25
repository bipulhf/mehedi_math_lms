import { randomUUID } from "node:crypto";

import type { MiddlewareHandler } from "hono";

import type { AppBindings } from "@/types/app-bindings";

const requestIdHeader = "x-request-id";

export const requestIdMiddleware: MiddlewareHandler<AppBindings> = async (context, next) => {
  const requestId = context.req.header(requestIdHeader) ?? randomUUID();

  context.set("requestId", requestId);
  context.header(requestIdHeader, requestId);

  await next();
};
