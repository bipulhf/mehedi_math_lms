import type { ErrorHandler } from "hono";

import { env } from "@/lib/env";
import type { AppBindings } from "@/types/app-bindings";
import { AppError } from "@/utils/errors";
import { error } from "@/utils/response";

export const onError: ErrorHandler<AppBindings> = (caughtError, context) => {
  context.get("logger").error({
    name: caughtError.name,
    message: caughtError.message,
    stack: caughtError.stack
  });

  if (caughtError instanceof AppError) {
    return error(context, caughtError.message, caughtError.statusCode, caughtError.issues);
  }

  return error(context, env.NODE_ENV === "production" ? "Internal server error" : caughtError.message, 500);
};
