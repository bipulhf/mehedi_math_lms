import type { ErrorHandler } from "hono";
import { ZodError } from "zod";

import { env } from "@/lib/env";
import type { AppBindings } from "@/types/app-bindings";
import { AppError, validationErrorFromZod } from "@/utils/errors";
import { error } from "@/utils/response";

export const onError: ErrorHandler<AppBindings> = (caughtError, context) => {
  context.get("logger").error({
    name: caughtError.name,
    message: caughtError.message,
    stack: caughtError.stack
  });

  // Routes validate by calling `schema.parse()` inline rather than through the
  // middleware in `validate.ts`, so a failed schema reaches here as a raw
  // ZodError. Left as one it takes the 500 branch below, and in production the
  // caller is told "Internal server error" for a field they typed wrong, with
  // the actual reason visible only in the log.
  const failure = caughtError instanceof ZodError ? validationErrorFromZod(caughtError) : caughtError;

  if (failure instanceof AppError) {
    return error(context, failure.message, failure.statusCode, failure.issues);
  }

  return error(context, env.NODE_ENV === "production" ? "Internal server error" : failure.message, 500);
};
