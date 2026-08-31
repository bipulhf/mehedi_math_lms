import type { MiddlewareHandler } from "hono";
import type { z, ZodType } from "zod";
import { ZodError } from "zod";

import type { AppBindings } from "@/types/app-bindings";
import { validationErrorFromZod } from "@/utils/errors";

export function validateJson<TSchema extends ZodType>(
  schema: TSchema
): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    try {
      const payload = await context.req.json();
      schema.parse(payload);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw validationErrorFromZod(error);
      }

      throw error;
    }
  };
}

export function validateQuery<TSchema extends z.ZodObject>(
  schema: TSchema
): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    try {
      schema.parse(context.req.query());
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw validationErrorFromZod(error);
      }

      throw error;
    }
  };
}

export function validateParams<TSchema extends z.ZodObject>(
  schema: TSchema
): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    try {
      schema.parse(context.req.param());
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw validationErrorFromZod(error);
      }

      throw error;
    }
  };
}
