import type { MiddlewareHandler } from "hono";
import type { UserRole } from "@mma/shared";

import { authGuardService } from "@/lib/container";
import type { AppBindings } from "@/types/app-bindings";

export function requireAuth(): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    await authGuardService.requireActiveSession(context.get("authSession"), context.get("authUser"));
    await next();
  };
}

export function requireRole(...roles: readonly UserRole[]): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    await authGuardService.requireRole(context.get("authSession"), context.get("authUser"), roles);
    await next();
  };
}

export function requireAdmin(): MiddlewareHandler<AppBindings> {
  return requireRole("ADMIN");
}
