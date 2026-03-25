import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { AppBindings } from "@/types/app-bindings";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function success<TData>(
  context: Context<AppBindings>,
  data: TData,
  status: ContentfulStatusCode = 200,
  message?: string
): Response {
  return context.json(
    {
      status: "success",
      message,
      data
    },
    status
  );
}

export function error(
  context: Context<AppBindings>,
  message: string,
  status: ContentfulStatusCode,
  issues?: readonly { field: string; message: string }[]
): Response {
  return context.json(
    {
      status: "error",
      message,
      issues
    },
    status
  );
}

export function paginated<TData>(
  context: Context<AppBindings>,
  data: readonly TData[],
  pagination: PaginationMeta
): Response {
  return context.json({
    status: "success",
    data,
    pagination
  });
}
