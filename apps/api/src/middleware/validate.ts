import type { MiddlewareHandler } from "hono";
import { z, ZodError, ZodType } from "zod";

import type { AppBindings } from "@/types/app-bindings";
import { ValidationError } from "@/utils/errors";

function mapZodIssues(error: ZodError): readonly { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message
  }));
}

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
        throw new ValidationError("Validation failed", mapZodIssues(error));
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
        throw new ValidationError("Validation failed", mapZodIssues(error));
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
        throw new ValidationError("Validation failed", mapZodIssues(error));
      }

      throw error;
    }
  };
}
