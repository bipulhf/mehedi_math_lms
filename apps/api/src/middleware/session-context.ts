import { auth } from "@mma/auth/server";
import type { MiddlewareHandler } from "hono";

import type { AppBindings } from "@/types/app-bindings";

export const sessionContextMiddleware: MiddlewareHandler<AppBindings> = async (context, next) => {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers
  });

  context.set("authSession", session?.session ?? null);
  context.set("authUser", session?.user ?? null);

  await next();
};
